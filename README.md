## Setup

```bash
npm install
npm run dev
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
