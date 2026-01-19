import { Request, Response, NextFunction } from 'express';
import { logger } from '../../lib/logger/logger';

/**
 * Request logging middleware
 * Logs incoming requests with method, URL, and response time
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  // Log incoming request
  logger.info(`[Incoming Request] ${req.method} ${req.url}`, {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logLevel = res.statusCode >= 400 ? 'error' : 'info';

    logger[logLevel](`[Response] ${req.method} ${req.url} - ${res.statusCode}`, {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
    });
  });

  next();
};

/**
 * Error logging middleware
 * Logs any errors that occur during request processing
 */
export const errorLogger = (err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error(`[Error] ${req.method} ${req.url}`, {
    method: req.method,
    url: req.url,
    error: err.message,
    stack: err.stack,
  });

  // Pass error to next error handler
  next(err);
};
