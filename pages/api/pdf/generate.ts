import { NextApiRequest, NextApiResponse } from 'next';
import { puppeteerUserFromReq } from '@/lib/authUtils';
import { logger } from '@/lib/logger/logger';
import puppeteer from 'puppeteer';

export const config = {
  api: {
    responseLimit: false,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check authorization
    const user = await puppeteerUserFromReq(req);

    if (!user) {
      logger.warn('[Simple PDF] Unauthorized');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    if (typeof url !== 'string' || !url.startsWith('http')) {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    logger.info(`[Simple PDF] Request from ${user.actorName}: ${url}`);

    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });

    const page = await browser.newPage();

    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px',
      },
    });

    await browser.close();

    logger.info(`[Simple PDF] Success: ${pdf.length} bytes`);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="generated.pdf"');
    res.setHeader('Content-Length', pdf.length);

    return res.send(pdf);

  } catch (error) {
    logger.error('[Simple PDF] Error:', error);

    return res.status(500).json({
      error: 'Failed to generate PDF',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
