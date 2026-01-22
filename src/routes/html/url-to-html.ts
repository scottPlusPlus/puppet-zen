import { Router, Request, Response } from 'express';
import { logger } from '../../../lib/logger/logger';
import { HtmlService } from '../../../lib/htmlService';
import { puppeteerUserFromReq } from '../../../lib/authUtils';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  try {
    const user = await puppeteerUserFromReq(req);

    if (!user) {
      logger.warn('[HTML API] Unauthorized');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { url, waitForSelector, waitTime } = req?.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    logger.info(`[HTML API] Request from ${user.actorName}:`, {
      url,
      waitForSelector,
      waitTime,
    });

    const htmlService = new HtmlService();
    const result = await htmlService.generateHtml({
      url,
      waitForSelector,
      waitTime,
      testMode: false,
    });

    if (result.success) {
      logger.info(`[HTML API] Success:`, {
        size: result.html?.length,
        duration: result.duration,
      });

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Content-Length', result.html?.length || 0);

      return res.send(result.html);
    } else {
      logger.error(`[HTML API] Failed:`, result.error);

      return res.status(500).json({
        error: 'Failed to generate HTML',
        message: result.error,
        duration: result.duration,
      });
    }
  } catch (error) {
    logger.error('[HTML API] Unexpected error:', error);

    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
