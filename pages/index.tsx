import Head from "next/head";

export default function Home() {
  return (
    <>
      <Head>
        <title>Puppeteer PDF Service</title>
        <meta name="description" content="puppeteer service" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main style={{
        maxWidth: '900px',
        margin: '0 auto',
        padding: '40px 20px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        lineHeight: '1.6'
      }}>
        <h1>Puppeteer PDF Service</h1>
        <p>A Next.js API service to convert URLs to PDF files with optional authorization.</p>

        <hr style={{ margin: '40px 0', border: 'none', borderTop: '1px solid #ddd' }} />

        <h2>🏥 Health Check</h2>
        <p>Check if the service and browser are working correctly.</p>

        <h3>Endpoint</h3>
        <code style={{
          display: 'block',
          background: '#f4f4f4',
          padding: '10px',
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          GET /api/health
        </code>

        <h3>Example</h3>
        <pre style={{
          background: '#f4f4f4',
          padding: '15px',
          borderRadius: '4px',
          overflow: 'auto'
        }}>
{`curl http://localhost:3000/api/health`}
        </pre>

        <h3>Response</h3>
        <pre style={{
          background: '#f4f4f4',
          padding: '15px',
          borderRadius: '4px',
          overflow: 'auto'
        }}>
{`{
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
}`}
        </pre>

        <hr style={{ margin: '40px 0', border: 'none', borderTop: '1px solid #ddd' }} />

        <h2>🚀 Simple PDF Generation</h2>
        <p>Quick and easy PDF generation with minimal configuration.</p>

        <h3>Endpoint</h3>
        <code style={{
          display: 'block',
          background: '#f4f4f4',
          padding: '10px',
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          POST /api/pdf/generate
        </code>

        <h3>Request Body</h3>
        <pre style={{
          background: '#f4f4f4',
          padding: '15px',
          borderRadius: '4px',
          overflow: 'auto'
        }}>
{`{
  "url": "https://example.com"
}`}
        </pre>

        <h3>Example (No Auth)</h3>
        <pre style={{
          background: '#f4f4f4',
          padding: '15px',
          borderRadius: '4px',
          overflow: 'auto'
        }}>
{`curl -X POST http://localhost:3000/api/pdf/generate \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://example.com"}' \\
  --output example.pdf`}
        </pre>

        <h3>Example (With Auth)</h3>
        <pre style={{
          background: '#f4f4f4',
          padding: '15px',
          borderRadius: '4px',
          overflow: 'auto'
        }}>
{`curl -X POST http://localhost:3000/api/pdf/generate \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{"url": "https://example.com"}' \\
  --output example.pdf`}
        </pre>

        <hr style={{ margin: '40px 0', border: 'none', borderTop: '1px solid #ddd' }} />

        <h2>⚡ Advanced PDF Generation</h2>
        <p>Advanced PDF generation with custom styling, page breaks, and broken image handling.</p>

        <h3>Endpoint</h3>
        <code style={{
          display: 'block',
          background: '#f4f4f4',
          padding: '10px',
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          POST /api/pdf/url-to-pdf
        </code>

        <h3>Request Body</h3>
        <pre style={{
          background: '#f4f4f4',
          padding: '15px',
          borderRadius: '4px',
          overflow: 'auto'
        }}>
{`{
  "url": "https://example.com",
  "reportId": "optional-report-id",
  "reportTitle": "Optional Report Title"
}`}
        </pre>

        <h3>Features</h3>
        <ul style={{ marginLeft: '20px' }}>
          <li>Custom PDF styling and headers</li>
          <li>Automatic page breaks for better formatting</li>
          <li>Broken image detection and replacement</li>
          <li>Custom filename generation</li>
          <li>Automatic cleanup of old PDFs</li>
        </ul>

        <h3>Example</h3>
        <pre style={{
          background: '#f4f4f4',
          padding: '15px',
          borderRadius: '4px',
          overflow: 'auto'
        }}>
{`curl -X POST http://localhost:3000/api/pdf/url-to-pdf \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{
    "url": "https://example.com",
    "reportId": "report-123",
    "reportTitle": "My Report"
  }' \\
  --output my-report.pdf`}
        </pre>

        <hr style={{ margin: '40px 0', border: 'none', borderTop: '1px solid #ddd' }} />

        <h2>🔐 Authorization</h2>
        <p>Authorization is <strong>optional</strong> and controlled by the <code>PUPPETEER_GEN_USER</code> environment variable.</p>

        <h3>How It Works</h3>
        <ul style={{ marginLeft: '20px' }}>
          <li>If <code>PUPPETEER_GEN_USER</code> is not set or empty → No authorization required</li>
          <li>If <code>PUPPETEER_GEN_USER</code> is set → Authorization required for all PDF endpoints</li>
        </ul>

        <h3>Environment Variable Format</h3>
        <pre style={{
          background: '#f4f4f4',
          padding: '15px',
          borderRadius: '4px',
          overflow: 'auto'
        }}>
{`PUPPETEER_GEN_USER="key1:User1,key2:User2,key3:User3"`}
        </pre>

        <h3>Using Authorization</h3>
        <p>Include the API key in the <code>Authorization</code> header with <code>Bearer</code> prefix:</p>
        <pre style={{
          background: '#f4f4f4',
          padding: '15px',
          borderRadius: '4px',
          overflow: 'auto'
        }}>
{`Authorization: Bearer key1`}
        </pre>

        <hr style={{ margin: '40px 0', border: 'none', borderTop: '1px solid #ddd' }} />

        <h2>📚 JavaScript Example</h2>
        <pre style={{
          background: '#f4f4f4',
          padding: '15px',
          borderRadius: '4px',
          overflow: 'auto'
        }}>
{`const response = await fetch('/api/pdf/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_API_KEY' // Optional
  },
  body: JSON.stringify({ url: 'https://example.com' })
});

const blob = await response.blob();
const url = window.URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'generated.pdf';
a.click();`}
        </pre>

        <hr style={{ margin: '40px 0', border: 'none', borderTop: '1px solid #ddd' }} />

        <h2>🐍 Python Example</h2>
        <pre style={{
          background: '#f4f4f4',
          padding: '15px',
          borderRadius: '4px',
          overflow: 'auto'
        }}>
{`import requests

headers = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_API_KEY'  # Optional
}

response = requests.post(
    'http://localhost:3000/api/pdf/generate',
    json={'url': 'https://example.com'},
    headers=headers
)

with open('example.pdf', 'wb') as f:
    f.write(response.content)`}
        </pre>

        <hr style={{ margin: '40px 0', border: 'none', borderTop: '1px solid #ddd' }} />

        <h2>⚠️ Error Responses</h2>

        <h3>401 Unauthorized</h3>
        <pre style={{
          background: '#f4f4f4',
          padding: '15px',
          borderRadius: '4px',
          overflow: 'auto'
        }}>
{`{
  "error": "Unauthorized",
  "message": "Valid authorization token required"
}`}
        </pre>

        <h3>400 Bad Request</h3>
        <pre style={{
          background: '#f4f4f4',
          padding: '15px',
          borderRadius: '4px',
          overflow: 'auto'
        }}>
{`{
  "error": "URL is required in request body"
}`}
        </pre>

        <h3>500 Server Error</h3>
        <pre style={{
          background: '#f4f4f4',
          padding: '15px',
          borderRadius: '4px',
          overflow: 'auto'
        }}>
{`{
  "error": "Failed to generate PDF",
  "message": "Detailed error message"
}`}
        </pre>

        <hr style={{ margin: '40px 0', border: 'none', borderTop: '1px solid #ddd' }} />

        <h2>🔧 Environment Variables</h2>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          marginTop: '20px'
        }}>
          <thead>
            <tr style={{ background: '#f4f4f4' }}>
              <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>Variable</th>
              <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>Required</th>
              <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: '10px', border: '1px solid #ddd' }}><code>PUPPETEER_GEN_USER</code></td>
              <td style={{ padding: '10px', border: '1px solid #ddd' }}>Optional</td>
              <td style={{ padding: '10px', border: '1px solid #ddd' }}>Comma-separated API keys for authorization (format: key:name)</td>
            </tr>
            <tr>
              <td style={{ padding: '10px', border: '1px solid #ddd' }}><code>PUPPETEER_EXECUTABLE_PATH</code></td>
              <td style={{ padding: '10px', border: '1px solid #ddd' }}>Optional</td>
              <td style={{ padding: '10px', border: '1px solid #ddd' }}>Custom Chrome executable path</td>
            </tr>
            <tr>
              <td style={{ padding: '10px', border: '1px solid #ddd' }}><code>GRAFANA_LOKI_HOST</code></td>
              <td style={{ padding: '10px', border: '1px solid #ddd' }}>Optional</td>
              <td style={{ padding: '10px', border: '1px solid #ddd' }}>Grafana Loki host for logging</td>
            </tr>
            <tr>
              <td style={{ padding: '10px', border: '1px solid #ddd' }}><code>GRAFANA_LOKI_USERNAME</code></td>
              <td style={{ padding: '10px', border: '1px solid #ddd' }}>Optional</td>
              <td style={{ padding: '10px', border: '1px solid #ddd' }}>Grafana username</td>
            </tr>
            <tr>
              <td style={{ padding: '10px', border: '1px solid #ddd' }}><code>GRAFANA_LOKI_PASSWORD</code></td>
              <td style={{ padding: '10px', border: '1px solid #ddd' }}>Optional</td>
              <td style={{ padding: '10px', border: '1px solid #ddd' }}>Grafana password</td>
            </tr>
          </tbody>
        </table>
      </main>
    </>
  );
}
