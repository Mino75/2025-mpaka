/**
 *  CACHE STRATEGY REQUIREMENTS
 * ===================================
 * 
 * GOAL: "Get once, always work, update if possible"
 * 
 * CONTEXT: Adapt to Network conditions 
 * - Very slow network connections in some areas
 * - Network can cut at any moment during fetch
 * - Users need reliable offline experience
 * - This is a microservice - all cached  declaredfiles are critical
 * 
 * STRATEGY: Adaptive Network-First with Smart Timeouts
 * 
 * 1. FIRST FETCH (New User / No Cache)
 *    - HIGH TIMEOUT (20-30 seconds)
 *    - Purpose: Ensure we get a complete working version cached
 *    - Behavior: Wait longer to accommodate slow networks
 *    - Fallback: If timeout/failure, show error (no cache available)
 * 
 * 2. SUBSEQUENT FETCHES (Returning User / Has Cache)
 *    - SHORT TIMEOUT (3-5 seconds)
 *    - Purpose: Don't block user experience while trying to update
 *    - Behavior: Quick network attempt, fast fallback to cache
 *    - Fallback: Serve cached version immediately on timeout/failure
 * 
 * 3. NETWORK FAILURE HANDLING
 *    - Any network timeout or connection cut -> serve from cache
 *    - Cache always serves the last working version
 *    - No partial updates - either complete success or use cache
 * 
 * 4. CRITICAL FILES POLICY
 *    - ALL manifest files are critical (no optional resources)
 *    - Failed fetch on any critical file = fallback to cached version
 *    - Never serve a mix of new/old files (consistency requirement)
 * 
 * 5. CACHE MANAGEMENT
 *    - Complete atomic updates only (all files or none)
 *    - Old cache versions must be cleaned up properly
 *    - Cache corruption protection (verify all files present)
 * 
 * 6. USER EXPERIENCE PRIORITIES
 *    - Reliability > Speed (app must always work)
 *    - Offline capability is essential
 *    - Background updates when possible, no blocking
 *    - Clear feedback when updates are available
 * 
 * IMPLEMENTATION NOTES:
 * - Detect first-time vs returning users by cache presence
 * - Use different timeout strategies to adapt to worst and best conditions (what can do more can do less)
 * - Implement proper service worker lifecycle management
 * - Ensure cache consistency and cleanup
 * - Handle challenging network conditions gracefully
 */

// server.js
const express = require('express');
const path = require('path');
const http = require('http');
const https = require('https');
const { URL } = require('url');

const app = express();

// Configuration
const PORT = process.env.PORT || 3000;
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
    : ['http://localhost:3000', `https://mpaka.kahiether.com`];
const BASIC_AUTH_USER = process.env.BASIC_AUTH_USER || 'mpaka';
const BASIC_AUTH_PASS = process.env.BASIC_AUTH_PASS || 'fdhjfdh2025';

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.static(__dirname));

// CORS middleware
app.use((req, res, next) => {
    const origin = req.headers.origin;
    
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
        res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }
    
    if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
    }
    
    next();
});

// Basic Auth middleware for API
function basicAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Basic ')) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    
    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
    const [username, password] = credentials.split(':');
    
    if (username === BASIC_AUTH_USER && password === BASIC_AUTH_PASS) {
        next();
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
}

// HTML content extraction function
function extractTextContent(html, baseUrl) {
    // Remove script tags and their content
    html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    
    // Remove style tags and their content
    html = html.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
    
    // Remove comments
    html = html.replace(/<!--[\s\S]*?-->/g, '');
    
    // Extract and process images
    html = html.replace(/<img[^>]*>/gi, (match) => {
        const altMatch = match.match(/alt=["']([^"']*)["']/i);
        const srcMatch = match.match(/src=["']([^"']*)["']/i);
        const alt = altMatch ? altMatch[1] : '';
        const src = srcMatch ? srcMatch[1] : '';
        
        if (alt || src) {
            return `[IMAGE: ${alt || src}]`;
        }
        return '[IMAGE]';
    });
    
    // Extract and process videos
    html = html.replace(/<video[^>]*>[\s\S]*?<\/video>/gi, (match) => {
        const srcMatch = match.match(/src=["']([^"']*)["']/i);
        const src = srcMatch ? srcMatch[1] : '';
        return `[VIDEO: ${src || 'embedded video'}]`;
    });
    
    // Extract and process audio
    html = html.replace(/<audio[^>]*>[\s\S]*?<\/audio>/gi, (match) => {
        const srcMatch = match.match(/src=["']([^"']*)["']/i);
        const src = srcMatch ? srcMatch[1] : '';
        return `[AUDIO: ${src || 'embedded audio'}]`;
    });
    
    // Extract and process iframes
    html = html.replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, (match) => {
        const srcMatch = match.match(/src=["']([^"']*)["']/i);
        const titleMatch = match.match(/title=["']([^"']*)["']/i);
        const src = srcMatch ? srcMatch[1] : '';
        const title = titleMatch ? titleMatch[1] : '';
        return `[IFRAME: ${title || src || 'embedded content'}]`;
    });
    
    // Extract title
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : '';
    
    // Extract meta description
    const metaMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i);
    const description = metaMatch ? metaMatch[1].trim() : '';
    
    // Process headings to maintain structure
    html = html.replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (match, level, content) => {
        const cleanContent = content.replace(/<[^>]*>/g, '').trim();
        return '\n\n' + '#'.repeat(parseInt(level)) + ' ' + cleanContent + '\n\n';
    });
    
    // Process paragraphs
    html = html.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (match, content) => {
        const cleanContent = content.replace(/<[^>]*>/g, '').trim();
        return cleanContent ? '\n\n' + cleanContent + '\n\n' : '';
    });
    
    // Process lists
    html = html.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (match, content) => {
        const cleanContent = content.replace(/<[^>]*>/g, '').trim();
        return cleanContent ? '\n• ' + cleanContent : '';
    });
    
    // Process links to preserve context
    html = html.replace(/<a[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi, (match, href, content) => {
        const cleanContent = content.replace(/<[^>]*>/g, '').trim();
        if (cleanContent && href && !href.startsWith('#')) {
            const absoluteUrl = resolveUrl(href, baseUrl);
            return `${cleanContent} [${absoluteUrl}]`;
        }
        return cleanContent;
    });
    
    // Remove remaining HTML tags
    html = html.replace(/<[^>]*>/g, ' ');
    
    // Clean up whitespace
    html = html.replace(/&nbsp;/g, ' ');
    html = html.replace(/&amp;/g, '&');
    html = html.replace(/&lt;/g, '<');
    html = html.replace(/&gt;/g, '>');
    html = html.replace(/&quot;/g, '"');
    html = html.replace(/&#39;/g, "'");
    html = html.replace(/\s+/g, ' ');
    html = html.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    // Build structured content
    let structuredContent = '';
    
    if (title) {
        structuredContent += `TITLE: ${title}\n\n`;
    }
    
    if (description) {
        structuredContent += `DESCRIPTION: ${description}\n\n`;
    }
    
    structuredContent += `URL: ${baseUrl}\n\n`;
    structuredContent += '---CONTENT---\n\n';
    structuredContent += html.trim();
    
    return structuredContent;
}

function resolveUrl(url, base) {
    try {
        return new URL(url, base).href;
    } catch {
        return url;
    }
}

// API endpoint
app.post('/api/extract', basicAuth, async (req, res) => {
    const { url } = req.body;
    
    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }
    
    try {
        // Validate URL
        const parsedUrl = new URL(url);
        if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
            throw new Error('Only HTTP and HTTPS protocols are supported');
        }
        
        // Choose HTTP or HTTPS module
        const client = parsedUrl.protocol === 'https:' ? https : http;
        
        // Fetch content
        const content = await new Promise((resolve, reject) => {
            const options = {
                hostname: parsedUrl.hostname,
                port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
                path: parsedUrl.pathname + parsedUrl.search,
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; mpaka/1.0; +https://mpaka.app)',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
                    'Accept-Encoding': 'gzip, deflate'
                },
                timeout: 30000
            };
            
            const request = client.request(options, (response) => {
                let data = [];
                
                // Handle redirects
                if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                    const redirectUrl = resolveUrl(response.headers.location, url);
                    return resolve(fetchUrl(redirectUrl));
                }
                
                if (response.statusCode !== 200) {
                    return reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
                }
                
                // Handle compressed responses
                let stream = response;
                if (response.headers['content-encoding'] === 'gzip') {
                    const zlib = require('zlib');
                    stream = response.pipe(zlib.createGunzip());
                } else if (response.headers['content-encoding'] === 'deflate') {
                    const zlib = require('zlib');
                    stream = response.pipe(zlib.createInflate());
                }
                
                stream.on('data', (chunk) => {
                    data.push(chunk);
                });
                
                stream.on('end', () => {
                    const html = Buffer.concat(data).toString('utf8');
                    resolve(html);
                });
                
                stream.on('error', (err) => {
                    reject(new Error(`Stream error: ${err.message}`));
                });
            });
            
            request.on('error', (err) => {
                reject(new Error(`Request error: ${err.message}`));
            });
            
            request.on('timeout', () => {
                request.destroy();
                reject(new Error('Request timeout'));
            });
            
            request.end();
        });
        
        // Extract text content
        const extractedContent = extractTextContent(content, url);
        
        res.json({
            success: true,
            content: extractedContent,
            url: url,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Extraction error:', error);
        res.status(500).json({ 
            error: error.message || 'Failed to extract content',
            url: url 
        });
    }
});

// Helper function for recursive redirects
async function fetchUrl(url, redirectCount = 0) {
    if (redirectCount > 5) {
        throw new Error('Too many redirects');
    }
    
    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === 'https:' ? https : http;
    
    return new Promise((resolve, reject) => {
        const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
            path: parsedUrl.pathname + parsedUrl.search,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; mpaka/1.0; +https://mpaka.app)',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
                'Accept-Encoding': 'gzip, deflate'
            },
            timeout: 30000
        };
        
        const request = client.request(options, (response) => {
            let data = [];
            
            // Handle redirects
            if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                const redirectUrl = resolveUrl(response.headers.location, url);
                return resolve(fetchUrl(redirectUrl, redirectCount + 1));
            }
            
            if (response.statusCode !== 200) {
                return reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
            }
            
            // Handle compressed responses
            let stream = response;
            if (response.headers['content-encoding'] === 'gzip') {
                const zlib = require('zlib');
                stream = response.pipe(zlib.createGunzip());
            } else if (response.headers['content-encoding'] === 'deflate') {
                const zlib = require('zlib');
                stream = response.pipe(zlib.createInflate());
            }
            
            stream.on('data', (chunk) => {
                data.push(chunk);
            });
            
            stream.on('end', () => {
                const html = Buffer.concat(data).toString('utf8');
                resolve(html);
            });
            
            stream.on('error', (err) => {
                reject(new Error(`Stream error: ${err.message}`));
            });
        });
        
        request.on('error', (err) => {
            reject(new Error(`Request error: ${err.message}`));
        });
        
        request.on('timeout', () => {
            request.destroy();
            reject(new Error('Request timeout'));
        });
        
        request.end();
    });
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        service: 'mpaka',
        timestamp: new Date().toISOString() 
    });
});

// Main route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ 
        error: 'Internal server error'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// Start server
app.listen(PORT, () => {
    console.log(`🌴 mpaka server running at http://localhost:${PORT}`);
    console.log(`Allowed origins: ${ALLOWED_ORIGINS.join(', ')}`);
});
