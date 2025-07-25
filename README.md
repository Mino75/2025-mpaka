# 🌴 mpaka -Content Extractor

A lightweight web application that extracts clean, structured text content from websites, optimized for AI indexing and processing. 

## ✨ Features

- 🔍 **Smart Content Extraction**: Removes scripts, styles, and technical HTML while preserving semantic structure
- 🖼️ **Media Handling**: Converts images, videos, and iframes to descriptive text placeholders
- 📝 **Large Text Support**: Handle millions of characters with real-time character counting
- 🔄 **Append Mode**: Multiple extractions are separated by clear delimiters
- 📱 **Fully Responsive**: Works perfectly on mobile and desktop devices
- 🌙 **Dark Theme**: Beautiful tropical dark theme inspired by Mada
- 🔒 **Secure**: Basic authentication and CORS protection
- ⚡ **Offline Support**: Service Worker for PWA functionality
- 🚀 **Zero External Dependencies**: Server uses only Node.js native modules

## 🛠️ Technology Stack

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Backend**: Node.js + Express
- **Infrastructure**: Docker-ready, PWA-enabled
- **No database required**

## 📦 Installation

### Local Development

1. Clone the repository:
```bash
git clone https://github.com/yourusername/mpaka.git
cd mpaka
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm start
```

4. Open http://localhost:3000 in your browser

### Docker Deployment

1. Build the image:
```bash
docker build -t mpaka:latest .
```

2. Run the container:
```bash
docker run -d -p 3000:3000 mpaka:latest
```

## 🔧 Configuration

All configuration is done through environment variables (with sensible defaults):

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `ALLOWED_ORIGINS` | `http://localhost:3000` | Comma-separated list of allowed origins |
| `BASIC_AUTH_USER` | `mpaka` | Username for API authentication |
| `BASIC_AUTH_PASS` | `madagascar2025` | Password for API authentication |

### Examples

```bash
# Single origin
docker run -e ALLOWED_ORIGINS=https://example.com -p 3000:3000 mpaka

# Multiple origins
docker run -e ALLOWED_ORIGINS="https://example.com,https://app.example.com" -p 3000:3000 mpaka

# Full configuration
docker run \
  -e PORT=8080 \
  -e ALLOWED_ORIGINS="https://example.com,https://app.example.com" \
  -e BASIC_AUTH_USER=myuser \
  -e BASIC_AUTH_PASS=mypassword \
  -p 8080:8080 \
  mpaka
```

## 🎯 Usage

1. **Enter a URL** in the input field
2. **Click "🔍 Extraire"** or press Enter
3. **Wait** for the content to be extracted
4. **Edit** the extracted content if needed
5. **Copy** the content using the "📋 Copier" button
6. **Multiple extractions** will be appended with a separator line

## 📁 Project Structure

```
mpaka/
├── index.html          # Main HTML file
├── main.js            # Frontend JavaScript logic
├── styles.js          # Dynamic CSS injection
├── server.js          # Node.js backend server
├── service-worker.js  # PWA offline support
├── manifest.json      # PWA manifest
├── package.json       # Node.js dependencies
├── dockerfile         # Docker configuration
├── LICENSE           # MIT License
└── README.md         # This file
```

## 🔌 API Endpoints

### POST `/api/extract`
Extract content from a URL.

**Headers:**
- `Content-Type: application/json`
- `Authorization: Basic <base64(username:password)>`

**Body:**
```json
{
  "url": "https://example.com"
}
```

**Response:**
```json
{
  "success": true,
  "content": "Extracted text content...",
  "url": "https://example.com",
  "timestamp": "2025-01-22T10:30:00.000Z"
}
```

### GET `/health`
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "service": "mpaka",
  "timestamp": "2025-01-22T10:30:00.000Z"
}
```

## 🎨 Theming

The application features a beautiful dark theme inspired by Madagascar:
- **Primary Background**: Deep brown (#0a0504)
- **Accent Color**: Tropical orange (#d4753a)
- **Text**: Warm beige (#e8d5c4)
- **Hover Effects**: Bright coral (#ff8c42)

## 🔒 Security Features

- **Basic Authentication**: API endpoints are protected
- **CORS Protection**: Only whitelisted origins can access the API
- **Input Validation**: URL validation on both client and server
- **Content Sanitization**: All extracted content is cleaned
- **Rate Limiting**: Through timeout settings
- **No External Dependencies**: Reduces attack surface

## 🚀 Performance

- **Lightweight**: ~50KB total frontend assets
- **Fast**: Native Node.js modules for optimal performance
- **Efficient**: Streaming response handling
- **Compressed**: Supports gzip/deflate
- **Cached**: Service Worker caching for offline use

## 📄 License

MIT License - See [LICENSE](LICENSE) file for details

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 🐛 Known Issues

- Some websites with heavy JavaScript rendering may not extract properly
- Very large pages (>10MB) may timeout
- Complex authentication-protected pages cannot be accessed

## 🌟 Future Enhancements

- [ ] Add support for more content types (PDF, DOC)
- [ ] Implement request queuing
- [ ] Add export formats (JSON, Markdown)
- [ ] Support for custom extraction rules
- [ ] Multi-language interface

## 👨‍💻 Author

Created with ❤️ by Mino

---
