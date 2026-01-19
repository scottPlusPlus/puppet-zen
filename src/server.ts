import dotenv from 'dotenv';

dotenv.config();

import app from './app';
import { logger } from '../lib/logger/logger';

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

const server = app.listen(PORT, () => {
  logger.info(`[Server] Puppeteer PDF Service started`, {
    port: PORT,
    host: HOST,
    environment: process.env.NODE_ENV || 'development',
    url: `http://${HOST}:${PORT}`,
  });
});

const gracefulShutdown = (signal: string) => {
  logger.info(`[Server] Received ${signal}, starting graceful shutdown`);

  server.close(() => {
    logger.info('[Server] Server closed successfully');
    process.exit(0);
  });

  setTimeout(() => {
    logger.error('[Server] Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (error) => {
  logger.error('[Server] Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('[Server] Unhandled Rejection at:', { promise, reason });
  gracefulShutdown('unhandledRejection');
});

export default server;
