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
/**
 * Enhanced server.js with advanced anti-bot detection bypass techniques
 * Fixes 403 Forbidden errors by implementing multiple evasion strategies
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
const { URL } = require('url');
const zlib = require('zlib');

const app = express();

// Configuration
const CACHE_VERSION = process.env.CACHE_VERSION || 'v2';
const APP_NAME = process.env.APP_NAME || 'mpaka';

const PORT = process.env.PORT || 3000;
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
    : ['http://localhost:3000', `https://mpaka.kahiether.com`];
const BASIC_AUTH_USER = process.env.BASIC_AUTH_USER || 'mpaka';
const BASIC_AUTH_PASS = process.env.BASIC_AUTH_PASS || 'fdhjfdh2025';

// Enhanced User Agent Pool - Rotate through different browsers
const USER_AGENTS = [
    // Chrome Windows
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
    
    // Firefox Windows
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/131.0',
    
    // Chrome Mac
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    
    // Firefox Mac
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:132.0) Gecko/20100101 Firefox/132.0',
    
    // Safari Mac
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1.1 Safari/605.1.15',
    
    // Edge Windows
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0'
];

// Get random user agent
function getRandomUserAgent() {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// Get comprehensive headers that match the user agent
function getEnhancedHeaders(userAgent, url) {
    const parsedUrl = new URL(url);
    const isHttps = parsedUrl.protocol === 'https:';
    
    // Base headers that all browsers send
    const baseHeaders = {
        'User-Agent': userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'en-US,en;q=0.9,fr;q=0.8',
        'Accept-Encoding': 'gzip, deflate' + (isHttps ? ', br' : ''),
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0'
    };
    
    // Add browser-specific headers
    if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
        baseHeaders['sec-ch-ua'] = '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"';
        baseHeaders['sec-ch-ua-mobile'] = '?0';
        baseHeaders['sec-ch-ua-platform'] = userAgent.includes('Windows') ? '"Windows"' : '"macOS"';
    } else if (userAgent.includes('Firefox')) {
        // Firefox doesn't send sec-ch-ua headers
        delete baseHeaders['Sec-Fetch-Dest'];
        delete baseHeaders['Sec-Fetch-Mode'];
        delete baseHeaders['Sec-Fetch-Site'];
        delete baseHeaders['Sec-Fetch-User'];
    } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
        // Safari has different sec-fetch headers
        baseHeaders['Sec-Fetch-Site'] = 'same-origin';
    } else if (userAgent.includes('Edg')) {
        baseHeaders['sec-ch-ua'] = '"Microsoft Edge";v="131", "Chromium";v="131", "Not_A Brand";v="24"';
        baseHeaders['sec-ch-ua-mobile'] = '?0';
        baseHeaders['sec-ch-ua-platform'] = '"Windows"';
    }
    
    return baseHeaders;
}

// Add random delays to mimic human behavior
function randomDelay() {
    return new Promise(resolve => {
        const delay = Math.random() * 2000 + 500; // 500ms to 2.5s
        setTimeout(resolve, delay);
    });
}

// Middleware
app.use(express.json({ limit: '10mb' }));

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

// HTML content extraction function (unchanged)
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
        const titleMatch = match.match(/title=["']([^"']*)["']/i);
        
        const alt = altMatch ? altMatch[1].substring(0, 200) : '';
        const src = srcMatch ? srcMatch[1].substring(0, 200) : '';
        const title = titleMatch ? titleMatch[1].substring(0, 200) : '';
        
        const description = alt || title || src;
        if (description) {
            return `[IMAGE: ${description}]`;
        }
        return '[IMAGE]';
    });
    
    // Extract and process videos
    html = html.replace(/<video[^>]*>[\s\S]*?<\/video>/gi, (match) => {
        const srcMatch = match.match(/src=["']([^"']*)["']/i);
        const titleMatch = match.match(/title=["']([^"']*)["']/i);
        const posterMatch = match.match(/poster=["']([^"']*)["']/i);
        
        const src = srcMatch ? srcMatch[1].substring(0, 200) : '';
        const title = titleMatch ? titleMatch[1].substring(0, 200) : '';
        const poster = posterMatch ? posterMatch[1].substring(0, 200) : '';
        
        const description = title || src || poster || 'embedded video';
        return `[VIDEO: ${description}]`;
    });
    
    // Extract and process audio
    html = html.replace(/<audio[^>]*>[\s\S]*?<\/audio>/gi, (match) => {
        const srcMatch = match.match(/src=["']([^"']*)["']/i);
        const titleMatch = match.match(/title=["']([^"']*)["']/i);
        
        const src = srcMatch ? srcMatch[1].substring(0, 200) : '';
        const title = titleMatch ? titleMatch[1].substring(0, 200) : '';
        
        const description = title || src || 'embedded audio';
        return `[AUDIO: ${description}]`;
    });
    
    // Extract and process iframes
    html = html.replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, (match) => {
        const srcMatch = match.match(/src=["']([^"']*)["']/i);
        const titleMatch = match.match(/title=["']([^"']*)["']/i);
        const nameMatch = match.match(/name=["']([^"']*)["']/i);
        
        const src = srcMatch ? srcMatch[1].substring(0, 200) : '';
        const title = titleMatch ? titleMatch[1].substring(0, 200) : '';
        const name = nameMatch ? nameMatch[1].substring(0, 200) : '';
        
        const description = title || name || src || 'embedded content';
        return `[IFRAME: ${description}]`;
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

// Enhanced fetch function with multiple retry strategies
async function enhancedFetch(url, maxRetries = 3) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`Attempt ${attempt}/${maxRetries} for ${url}`);
            
            // Add random delay between retries (except first attempt)
            if (attempt > 1) {
                await randomDelay();
            }
            
            // Get fresh user agent and headers for each attempt
            const userAgent = getRandomUserAgent();
            const headers = getEnhancedHeaders(userAgent, url);
            
            console.log(`Using User-Agent: ${userAgent.substring(0, 50)}...`);
            
            const content = await fetchWithHeaders(url, headers);
            console.log(`✅ Success on attempt ${attempt} for ${url}`);
            return content;
            
        } catch (error) {
            lastError = error;
            console.log(`❌ Attempt ${attempt} failed for ${url}: ${error.message}`);
            
            // If it's a 403, try different strategies
            if (error.message.includes('403') && attempt < maxRetries) {
                console.log(`🔄 Retrying with different strategy...`);
                continue;
            }
            
            // If it's not 403 or last attempt, break
            if (!error.message.includes('403') || attempt === maxRetries) {
                break;
            }
        }
    }
    
    throw lastError;
}

// Fetch function with enhanced headers
async function fetchWithHeaders(url, headers) {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const client = parsedUrl.protocol === 'https:' ? https : http;
        
        const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
            path: parsedUrl.pathname + parsedUrl.search,
            method: 'GET',
            headers: headers,
            timeout: 30000
        };
        
        const request = client.request(options, (response) => {
            let data = [];
            
            // Handle redirects
            if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                const redirectUrl = resolveUrl(response.headers.location, url);
                console.log(`🔀 Redirecting to: ${redirectUrl}`);
                return resolve(fetchWithHeaders(redirectUrl, headers));
            }
            
            if (response.statusCode !== 200) {
                return reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
            }
            
            // Handle compressed responses
            let stream = response;
            const encoding = response.headers['content-encoding'];
            
            if (encoding === 'gzip') {
                stream = response.pipe(zlib.createGunzip());
            } else if (encoding === 'deflate') {
                stream = response.pipe(zlib.createInflate());
            } else if (encoding === 'br') {
                stream = response.pipe(zlib.createBrotliDecompress());
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

// Enhanced API endpoint with anti-bot measures
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
        
        console.log(`🚀 Starting extraction for: ${url}`);
        
        // Use enhanced fetch with multiple retry strategies
        const content = await enhancedFetch(url);
        
        // Extract text content
        const extractedContent = extractTextContent(content, url);
        
        console.log(`✅ Successfully extracted content from: ${url}`);
        
        res.json({
            success: true,
            content: extractedContent,
            url: url,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error(`❌ Extraction error for ${url}:`, error);
        res.status(500).json({ 
            error: error.message || 'Failed to extract content',
            url: url,
            suggestion: error.message.includes('403') 
                ? 'The website is blocking automated requests. This is common for sites with anti-bot protection.'
                : 'Check if the URL is accessible and try again.'
        });
    }
});

// Cache Lock Rescue - Intercept main.js to inject rescue code
app.get('/main.js', (req, res) => {
  try {
    let jsContent = fs.readFileSync(path.join(__dirname, 'main.js'), 'utf8');
    
    const rescueCode = `
// Cache Lock Rescue - Check for ${CACHE_VERSION} users and free older versions
if ('serviceWorker' in navigator) {
  caches.keys().then(cacheNames => {
    const hasCurrentVersion = cacheNames.some(name => name.includes('-${CACHE_VERSION}'));
    
    if (!hasCurrentVersion && cacheNames.length > 0) {
      console.log('Cache lock detected - rescuing to ${CACHE_VERSION}...');
      navigator.serviceWorker.getRegistration().then(reg => {
          if (reg) {
            reg.unregister().then(() => location.reload());
          } else {
            location.reload();
          }
        }).catch(() => {
          location.reload();
        });
    }
    
    navigator.serviceWorker.register('/service-worker.js', {updateViaCache: 'none'});
  });
}
`;
    
    const finalContent = rescueCode + '\n\n' + jsContent;
    
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Cache-Control', 'no-cache');
    res.send(finalContent);
    
  } catch (error) {
    console.error('Error serving main.js:', error);
    res.status(500).send('Error loading main.js');
  }
});

// Service Worker with cache-busting headers and version injection
app.get('/service-worker.js', (req, res) => {
  try {
    let swContent = fs.readFileSync(path.join(__dirname, 'service-worker.js'), 'utf8');
    
    const versionInjection = `
// Version injected by server
self.SW_CACHE_NAME = self.SW_CACHE_NAME || '${APP_NAME}-${CACHE_VERSION}';
self.SW_TEMP_CACHE_NAME = self.SW_TEMP_CACHE_NAME || '${APP_NAME}-temp-${CACHE_VERSION}';
self.SW_FIRST_TIME_TIMEOUT = '${process.env.SW_FIRST_TIME_TIMEOUT || '20000'}';
self.SW_RETURNING_USER_TIMEOUT = '${process.env.SW_RETURNING_USER_TIMEOUT || '5000'}';
self.SW_ENABLE_LOGS = '${process.env.SW_ENABLE_LOGS || 'true'}';
`;
    
    swContent = versionInjection + '\n' + swContent;
    
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.send(swContent);
    
  } catch (error) {
    console.error('Error serving service worker:', error);
    res.status(500).send('Error loading service worker');
  }
});

// Serve static files
app.use(express.static(__dirname));

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
    console.log(`🤖 Anti-bot measures enabled with ${USER_AGENTS.length} user agents`);
});
