import { Router, Request, Response } from 'express';
import fs from 'fs';
import { logger } from '../../lib/logger/logger';
import { PDF_AUTH_HEADER, PdfService } from '../../lib/pdfService';
import { puppeteerUserFromReq } from '../../lib/authUtils';

const router = Router();

/**
 * URL to PDF generation endpoint
 * POST /api/pdf/url-to-pdf
 * Generates a PDF from a given URL using Puppeteer
 */
router.post('/url-to-pdf', async (req: Request, res: Response) => {
  try {
    console.log(req.headers);
    const user = await puppeteerUserFromReq(req);

    if (!user) {
      logger.warn('[PDF API] Unauthorized');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { url, reportId, reportTitle } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const pdfAuthToken = req.headers[PDF_AUTH_HEADER] as string;

    logger.info(`[PDF API] Request from ${user.actorName}:`, {
      url,
      reportId,
      reportTitle,
    });

    const pdfService = new PdfService();
    const result = await pdfService.generatePdf({
      url,
      reportId,
      reportTitle,
      pdfAuthToken,
      testMode: false,
    });

    if (result.success) {
      logger.info(`[PDF API] Success:`, {
        filename: result.filename,
        size: result.size,
        duration: result.duration,
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${result.filename}"`
      );
      res.setHeader('Content-Length', result.size || 0);

      const fileStream = fs.createReadStream(result.filePath!);

      fileStream.pipe(res);

      res.on('finish', () => {
        logger.info(`[PDF API] PDF streamed successfully`);

        try {
          fs.unlinkSync(result.filePath!);
          logger.info(`[PDF API] Temporary file deleted: ${result.filename}`);
        } catch (deleteError) {
          logger.error(`[PDF API] Failed to delete temp file:`, deleteError);
        }
      });

      fileStream.on('error', (error: Error) => {
        logger.error(`[PDF API] Stream error:`, error);

        fileStream.destroy();

        try {
          if (fs.existsSync(result.filePath!)) {
            fs.unlinkSync(result.filePath!);
            logger.info(`[PDF API] Cleaned up file after error`);
          }
        } catch (deleteError) {
          logger.error(`[PDF API] Failed to cleanup:`, deleteError);
        }

        if (!res.headersSent) {
          res.status(500).json({
            error: 'Failed to stream PDF',
            message: error.message,
          });
        }
      });
    } else {
      logger.error(`[PDF API] Failed:`, result.error);

      return res.status(500).json({
        error: 'Failed to generate PDF',
        message: result.error,
        duration: result.duration,
      });
    }
  } catch (error) {
    logger.error('[PDF API] Unexpected error:', error);

    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
