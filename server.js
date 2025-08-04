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

/**
 * Simplified server.js with Playwright fallback for failed requests
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
const { URL } = require('url');
const zlib = require('zlib');
const { chromium, firefox } = require('playwright');

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

// Single user agent for simple fetch
const DEFAULT_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

// Get basic headers
function getBasicHeaders(url) {
    const parsedUrl = new URL(url);
    const isHttps = parsedUrl.protocol === 'https:';
    
    return {
        'User-Agent': DEFAULT_USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate' + (isHttps ? ', br' : ''),
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
    };
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

// Simple fetch function
async function simpleFetch(url) {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const client = parsedUrl.protocol === 'https:' ? https : http;
        const headers = getBasicHeaders(url);
        
        const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
            path: parsedUrl.pathname + parsedUrl.search,
            method: 'GET',
            headers: headers,
            timeout: 15000
        };
        
        const request = client.request(options, (response) => {
            let data = [];
            
            // Handle redirects
            if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                const redirectUrl = resolveUrl(response.headers.location, url);
                console.log(`🔀 Redirecting to: ${redirectUrl}`);
                return resolve(simpleFetch(redirectUrl));
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

// Playwright fallback function
async function playwrightFetch(url) {
    console.log('🎭 Starting Playwright fallback...');
    
    // Randomly choose between chromium and firefox
    const browsers = [chromium, firefox];
    const selectedBrowser = browsers[Math.floor(Math.random() * browsers.length)];
    const browserName = selectedBrowser === chromium ? 'Chromium' : 'Firefox';
    
    console.log(`🎭 Using ${browserName} for ${url}`);
    
    let browser, page;
    
    try {
        browser = await selectedBrowser.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--no-first-run',
                '--no-zygote',
                '--single-process'
            ]
        });
        
        page = await browser.newPage();
        
        // Set a reasonable viewport
        await page.setViewportSize({ width: 1280, height: 720 });
        
        // Navigate to the page with timeout
        await page.goto(url, { 
            waitUntil: 'domcontentloaded',
            timeout: 30000 
        });
        
        // Wait a bit for dynamic content to load
        await page.waitForTimeout(2000);
        
        // Get the HTML content
        const html = await page.content();
        
        console.log(`✅ ${browserName} successfully fetched content from ${url}`);
        return html;
        
    } catch (error) {
        console.error(`❌ ${browserName} failed for ${url}:`, error.message);
        throw error;
    } finally {
        if (page) await page.close().catch(() => {});
        if (browser) await browser.close().catch(() => {});
    }
}

// Main fetch function with Playwright fallback
async function fetchWithFallback(url) {
    try {
        console.log(`🌐 Trying simple fetch for: ${url}`);
        const content = await simpleFetch(url);
        console.log(`✅ Simple fetch succeeded for: ${url}`);
        return content;
    } catch (error) {
        console.log(`❌ Simple fetch failed for ${url}: ${error.message}`);
        console.log(`🎭 Falling back to Playwright...`);
        
        try {
            const content = await playwrightFetch(url);
            return content;
        } catch (playwrightError) {
            console.error(`❌ Playwright also failed for ${url}: ${playwrightError.message}`);
            throw new Error(`Both simple fetch and browser failed: ${error.message} | ${playwrightError.message}`);
        }
    }
}

// API endpoint with simplified fetch strategy
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
        
        // Use simplified fetch with Playwright fallback
        const content = await fetchWithFallback(url);
        
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
            url: url
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
    console.log(`🎭 Playwright fallback enabled`);
});
