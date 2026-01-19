# Puppeteer PDF Service

A PDF generation service built with Express.js and Puppeteer. This service converts web pages to PDF documents with advanced features like image validation, custom styling, and authentication.

## Technology Stack

- **Runtime**: Node.js
- **Framework**: Express.js (latest)
- **PDF Generation**: Puppeteer
- **Language**: TypeScript
- **Logging**: Winston with Grafana Loki integration

## Setup

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start development server
npm run dev

# Or start without watch mode
npm run start:dev
```

## Build & Production

```bash
# Build TypeScript to JavaScript
npm run build

# Start production server
npm start
```

## API Endpoints

### Health Check
```bash
GET /api/health
```


### Generate PDF
```bash
POST /api/pdf/url-to-pdf
Content-Type: application/json

{
  "url": "https://example.com",
  "reportId": "optional-id",
  "reportTitle": "Optional Title"
}
```

## Authorization (Optional)

Set `PUPPETEER_GEN_USER` environment variable to enable auth:

```bash
PUPPETEER_GEN_USER="key1:User1,key2:User2"
```

Include in requests:
```bash
Authorization: Bearer key1
```

## Environment Variables

```bash
PUPPETEER_GEN_USER=           # Optional: API keys (format: key:name,key2:name2)
```
