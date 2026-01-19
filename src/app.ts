import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { requestLogger, errorLogger } from './middleware/logger.middleware';
import { logger } from '../lib/logger/logger';
import routes from './routes';

const app: Application = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-pdf-access-token'],
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use(requestLogger);

app.get('/', (req: Request, res: Response) => {
  res.json({
    service: 'puppeteer-service',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/api/health',
      pdf: '/api/pdf/url-to-pdf',
    },
  });
});

app.use('/api', routes);

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

app.use(errorLogger);

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
