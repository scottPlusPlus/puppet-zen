# Puppeteer PDF Service

A Next.js API service that converts web pages to PDF files using Puppeteer. Optimized for deployment on Render with optional authorization.

## Features

- 🏥 Health check endpoint with browser connectivity status
- 🚀 Simple and advanced PDF generation endpoints
- 🔐 Optional API key authorization via environment variables
- 📝 Comprehensive logging with Grafana/Loki support
- 🎨 Advanced PDF styling with custom headers and page breaks
- 🖼️ Broken image detection and replacement
- 🧹 Automatic cleanup of old PDFs
- ☁️ Ready for Render deployment
- 📦 Built with Next.js 14 and TypeScript

## Quick Start

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the API documentation.

### Build

```bash
npm run build
npm start
```

## API Endpoints

### 🏥 Health Check

Check if the service and browser are working correctly.

**Endpoint:** `GET /api/health`

**Example:**
```bash
curl http://localhost:3000/api/health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-01-15T10:30:00.000Z",
  "service": "puppeteer-pdf-service",
  "version": "1.0.0",
  "browserConnected": true,
  "browserVersion": "Chrome/131.0.6778.85",
  "endpoints": {
    "simple": "/api/pdf/generate",
    "advanced": "/api/pdf/url-to-pdf"
  }
}
```

---

### 🚀 Simple PDF Generation

Quick and easy PDF generation with minimal configuration.

**Endpoint:** `POST /api/pdf/generate`

**Request Body:**
```json
{
  "url": "https://example.com"
}
```

**Example (No Authorization):**
```bash
curl -X POST http://localhost:3000/api/pdf/generate \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}' \
  --output example.pdf
```

**Example (With Authorization):**
```bash
curl -X POST http://localhost:3000/api/pdf/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{"url": "https://example.com"}' \
  --output example.pdf
```

---

### ⚡ Advanced PDF Generation

Advanced PDF generation with custom styling, page breaks, and broken image handling.

**Endpoint:** `POST /api/pdf/url-to-pdf`

**Request Body:**
```json
{
  "url": "https://example.com",
  "reportId": "optional-report-id",
  "reportTitle": "Optional Report Title"
}
```

**Features:**
- Custom PDF styling and headers
- Automatic page breaks for better formatting
- Broken image detection and replacement
- Custom filename generation
- Automatic cleanup of old PDFs (24 hours)

**Example:**
```bash
curl -X POST http://localhost:3000/api/pdf/url-to-pdf \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "url": "https://example.com",
    "reportId": "report-123",
    "reportTitle": "My Report"
  }' \
  --output my-report.pdf
```

---

## 🔐 Authorization

Authorization is **optional** and controlled by the `PUPPETEER_GEN_USER` environment variable.

### How It Works

- **If `PUPPETEER_GEN_USER` is not set or empty** → No authorization required
- **If `PUPPETEER_GEN_USER` is set** → Authorization required for all PDF endpoints

### Environment Variable Format

```bash
PUPPETEER_GEN_USER="key1:User1,key2:User2,key3:User3"
```

Each entry is in the format `apiKey:userName`, separated by commas.

### Using Authorization

Include the API key in the `Authorization` header with `Bearer` prefix:

```bash
Authorization: Bearer key1
```

### Example with Authorization

**JavaScript:**
```javascript
const response = await fetch('/api/pdf/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_API_KEY'
  },
  body: JSON.stringify({ url: 'https://example.com' })
});

const blob = await response.blob();
const url = window.URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'generated.pdf';
a.click();
```

**Python:**
```python
import requests

headers = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_API_KEY'
}

response = requests.post(
    'http://localhost:3000/api/pdf/generate',
    json={'url': 'https://example.com'},
    headers=headers
)

with open('example.pdf', 'wb') as f:
    f.write(response.content)
```

---

## 🔧 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PUPPETEER_GEN_USER` | Optional | Comma-separated API keys for authorization (format: `key:name`) |
| `PUPPETEER_EXECUTABLE_PATH` | Optional | Custom Chrome executable path |
| `NODE_ENV` | Optional | Set to `production` for production mode |
| `GRAFANA_LOKI_HOST` | Optional | Grafana Loki host for logging |
| `GRAFANA_LOKI_USERNAME` | Optional | Grafana username for logging |
| `GRAFANA_LOKI_PASSWORD` | Optional | Grafana password for logging |

### Example .env File

```bash
# Optional: Enable authorization
PUPPETEER_GEN_USER="secret-key-1:John,secret-key-2:Jane"

# Optional: Custom Chrome path (for Render deployment)
PUPPETEER_EXECUTABLE_PATH=/opt/render/project/src/puppeteer-cache/chrome/linux-*/chrome-linux*/chrome

# Optional: Grafana logging
GRAFANA_LOKI_HOST=https://logs-prod.grafana.net
GRAFANA_LOKI_USERNAME=your-username
GRAFANA_LOKI_PASSWORD=your-password
```

---

## 🚢 Deployment on Render

### Option 1: Using render.yaml (Recommended)

1. Push your code to a Git repository (GitHub, GitLab, etc.)
2. Create a new Web Service on Render
3. Connect your repository
4. Render will automatically detect the `render.yaml` file
5. Add environment variables (if using authorization)
6. Click "Create Web Service"

### Option 2: Manual Configuration

1. Create a new Web Service on Render
2. Connect your repository
3. Configure the service:
   - **Build Command:** `./render-build.sh`
   - **Start Command:** `npm start`
   - **Environment Variables:**
     - `NODE_ENV=production`
     - `PUPPETEER_CACHE_DIR=/opt/render/project/src/puppeteer-cache`
     - `PUPPETEER_GEN_USER=your-key:YourName` (optional)

### Important Notes for Render

- The build script (`render-build.sh`) automatically installs Chrome for Puppeteer
- Make sure the build script is executable: `chmod +x render-build.sh`
- The service requires at least 512MB of RAM (Starter plan or higher recommended)
- First deployment may take 5-10 minutes due to Chrome installation

---

## 📁 Project Structure

```
puppeteer-service-2/
├── lib/
│   ├── logger/                    # Logging system
│   │   ├── ConsoleLogger.ts
│   │   ├── GrafanaLogger.ts
│   │   └── logger.ts              # Main logger export
│   ├── authUtils.ts               # Authorization utilities
│   ├── pdfAuthUtils.ts            # PDF auth header utilities
│   ├── pdfService.ts              # Advanced PDF service
│   └── webRequestUtils.ts         # Request utilities (stubs)
├── pages/
│   ├── api/
│   │   ├── health.ts              # Health check endpoint
│   │   └── pdf/
│   │       ├── generate.ts        # Simple PDF endpoint
│   │       └── url-to-pdf.ts      # Advanced PDF endpoint
│   ├── _app.tsx                   # Next.js app component
│   └── index.tsx                  # Homepage with API docs
├── next.config.js                 # Next.js configuration
├── tsconfig.json                  # TypeScript configuration
├── package.json                   # Dependencies
├── render-build.sh                # Render build script
├── render.yaml                    # Render configuration
└── README.md                      # This file
```

---

## ⚠️ Error Responses

### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "Valid authorization token required"
}
```

### 400 Bad Request
```json
{
  "error": "URL is required in request body"
}
```

### 500 Server Error
```json
{
  "error": "Failed to generate PDF",
  "message": "Detailed error message"
}
```

---

## 🛠️ Built With

- [Next.js 14](https://nextjs.org/) - React framework
- [Puppeteer](https://pptr.dev/) - Headless Chrome automation
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Winston](https://github.com/winstonjs/winston) - Logging framework
- [Winston-Loki](https://github.com/JaniAnttonen/winston-loki) - Grafana Loki transport

---

## 📝 License

MIT

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## 📞 Support

For issues and questions, please open an issue on the GitHub repository.
