import { Router, Request, Response } from 'express';
import { logger } from '../../../lib/logger/logger';
import { HtmlService } from '../../../lib/htmlService';
import { MarkdownFormatter } from '../../../lib/markdownFormatter';
import { puppeteerUserFromReq } from '../../../lib/authUtils';

const router = Router();

interface UrlToMarkdownRequest {
  url: string;
  waitForSelector?: string;
  waitTime?: number;
  includeFrontmatter?: boolean;
  includeMetadata?: boolean;
  includeSourceUrl?: boolean;
  includeFetchTime?: boolean;
  returnAsFile?: boolean;
}

router.post('/', async (req: Request, res: Response) => {
  try {
    const user = await puppeteerUserFromReq(req);

    if (!user) {
      logger.warn('[Markdown API] Unauthorized');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      url,
      waitForSelector,
      waitTime,
      includeFrontmatter = true,
      includeMetadata = true,
      includeSourceUrl = true,
      includeFetchTime = true,
      returnAsFile = false,
    } = req?.body as UrlToMarkdownRequest;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    logger.info(`[Markdown API] Request from ${user.actorName}:`, {
      url,
      waitForSelector,
      waitTime,
      includeFrontmatter,
      includeMetadata,
      returnAsFile,
    });

    const htmlService = new HtmlService();
    const result = await htmlService.generateHtml({
      url,
      waitForSelector,
      waitTime,
      testMode: false,
      args: {
        bodyMarkdown: true,
        fullHtml: false,
      },
    });

    if (result.success && result.metadata) {
      logger.info(`[Markdown API] Success:`, {
        duration: result.duration,
        markdownLength: result.metadata.bodyMarkdown?.length,
      });

      // Format markdown with proper structure
      const formattedMarkdown = MarkdownFormatter.formatToFile(
        result.metadata,
        {
          includeFrontmatter,
          includeMetadata,
          includeSourceUrl,
          includeFetchTime,
        },
      );

      // Return as downloadable file
      if (returnAsFile) {
        const filename = MarkdownFormatter.generateFilename(result.metadata);
        res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="${filename}"`,
        );
        res.setHeader('Content-Length', Buffer.byteLength(formattedMarkdown));
        return res.send(formattedMarkdown);
      }

      // Return as JSON with metadata
      return res.status(200).json({
        success: true,
        markdown: formattedMarkdown,
        metadata: {
          title: result.metadata.title,
          url: result.metadata.url,
          fullUrl: result.metadata.fullUrl,
          hash: result.metadata.hash,
          summary: result.metadata.summary,
          image: result.metadata.image,
          icon: result.metadata.icon,
          fetchTimeUts: result.metadata.fetchTimeUts,
          suggestedFilename: MarkdownFormatter.generateFilename(
            result.metadata,
          ),
        },
        duration: result.duration,
      });
    } else {
      logger.error(`[Markdown API] Failed:`, result.error);

      return res.status(500).json({
        error: 'Failed to generate markdown',
        message: result.error,
        duration: result.duration,
      });
    }
  } catch (error) {
    logger.error('[Markdown API] Unexpected error:', error);

    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
