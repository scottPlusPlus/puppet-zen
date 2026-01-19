import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { requestLogger, errorLogger } from './middleware/logger.middleware';
import { logger } from '../lib/logger/logger';
import healthRouter from './routes/health';
import pdfRouter from './routes/pdf';

const app: Application = express();

// ===== MIDDLEWARE SETUP =====

// CORS middleware - allow all origins
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-pdf-access-token'],
}));

// Body parsing middleware
app.use(express.json({ limit: '50mb' })); // Parse JSON bodies
app.use(express.urlencoded({ extended: true, limit: '50mb' })); // Parse URL-encoded bodies

// Request logging middleware
app.use(requestLogger);

// ===== ROUTES =====

// Health check route
app.use('/api/health', healthRouter);

// PDF generation routes
app.use('/api/pdf', pdfRouter);

// Root route - API documentation
app.get('/', (req: Request, res: Response) => {
  res.json({
    service: 'puppeteer-pdf-service',
    version: '1.0.0',
    description: 'PDF generation service using Puppeteer',
    endpoints: {
      health: '/api/health',
      pdf: '/api/pdf/url-to-pdf',
    },
    documentation: {
      health: {
        method: 'GET',
        url: '/api/health',
        description: 'Check service health and browser connectivity',
      },
      urlToPdf: {
        method: 'POST',
        url: '/api/pdf/url-to-pdf',
        description: 'Generate PDF from URL',
        body: {
          url: 'string (required) - URL to convert to PDF',
          reportId: 'string (optional) - Report identifier',
          reportTitle: 'string (optional) - Report title for filename',
        },
        headers: {
          Authorization: 'Bearer <token> - API authentication token',
          'x-pdf-access-token': 'string (optional) - PDF access token',
        },
      },
    },
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  logger.warn(`[404] Route not found: ${req.method} ${req.url}`);
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.url} not found`,
    availableEndpoints: {
      health: '/api/health',
      pdf: '/api/pdf/url-to-pdf',
    },
  });
});

// Error logging middleware
app.use(errorLogger);

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('[Global Error Handler]', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
  });

  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message || 'An unexpected error occurred',
  });
});

export default app;
