import { NextApiRequest, NextApiResponse } from 'next';
import puppeteer from 'puppeteer';
import { logger } from '@/lib/logger/logger';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed. Use GET.' });
  }

  try {
    logger.info('[Health] Health check requested');

    let browserConnected = false;
    let browserVersion = '';

    try {
      // Try to launch browser to verify Puppeteer is working
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        timeout: 10000,
      });

      browserVersion = await browser.version();
      await browser.close();
      browserConnected = true;

      logger.info('[Health] Browser check successful:', { browserVersion });
    } catch (browserError) {
      logger.warn('[Health] Browser check failed:', browserError);
      browserConnected = false;
    }

    const response = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'puppeteer-pdf-service',
      version: '1.0.0',
      browserConnected,
      browserVersion: browserConnected ? browserVersion : undefined,
      endpoints: {
        simple: '/api/generate-pdf',
        advanced: '/api/report/url-to-pdf',
      },
    };

    logger.info('[Health] Health check response:', response);

    return res.status(200).json(response);
  } catch (error) {
    logger.error('[Health] Health check error:', error);

    return res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
