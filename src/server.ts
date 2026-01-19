import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

import app from './app';
import { logger } from '../lib/logger/logger';

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Start the server
const server = app.listen(PORT, () => {
  logger.info(`[Server] Puppeteer PDF Service started`, {
    port: PORT,
    host: HOST,
    environment: process.env.NODE_ENV || 'development',
    url: `http://${HOST}:${PORT}`,
  });

  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   Puppeteer PDF Service                                    ║
║                                                            ║
║   Server running at: http://${HOST}:${PORT}${' '.repeat(23 - String(PORT).length)}║
║   Environment: ${(process.env.NODE_ENV || 'development').padEnd(44)}║
║                                                            ║
║   API Endpoints:                                           ║
║   - Health Check: GET  /api/health                         ║
║   - Generate PDF: POST /api/pdf/url-to-pdf                 ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
const gracefulShutdown = (signal: string) => {
  logger.info(`[Server] Received ${signal}, starting graceful shutdown`);

  server.close(() => {
    logger.info('[Server] Server closed successfully');
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error('[Server] Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

// Listen for termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('[Server] Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('[Server] Unhandled Rejection at:', { promise, reason });
  gracefulShutdown('unhandledRejection');
});

export default server;
