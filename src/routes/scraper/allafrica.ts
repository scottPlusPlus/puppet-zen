import { Router, Request, Response } from "express";
import { logger } from "../../../lib/logger/logger";
import { AuthenticatedScraperService } from "../../../lib/authenticatedScraperService";
import { puppeteerUserFromReq } from "../../../lib/authUtils";
import { ALLAFRICA_AUTH_CONFIG } from "../../../config/scrapers/allafrica.config";

const router = Router();

router.post("/", async (req: Request, res: Response) => {
  try {
    const user = await puppeteerUserFromReq(req);

    if (!user) {
      logger.warn("[AllAfrica API] Unauthorized");
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { articleUrl, email, password, waitForSelector, waitTime, args } =
      req?.body;

    if (!articleUrl) {
      return res.status(400).json({ error: "articleUrl is required" });
    }

    if (!email) {
      return res.status(400).json({ error: "email is required" });
    }

    if (!password) {
      return res.status(400).json({ error: "password is required" });
    }

    logger.info(`[AllAfrica API] Request from ${user.actorName}:`, {
      articleUrl,
      email,
      waitForSelector,
      waitTime,
      args,
    });

    const scraperService = new AuthenticatedScraperService();
    const result = await scraperService.scrapeAuthenticatedContent({
      articleUrl,
      email,
      password,
      authConfig: ALLAFRICA_AUTH_CONFIG,
      waitForSelector,
      waitTime,
      testMode: true,
      args,
    });

    if (result.success) {
      logger.info(`[AllAfrica API] Success:`, {
        size: result.html?.length,
        duration: result.duration,
        hasMetadata: !!result.metadata,
        hasMarkdown: !!result.metadata?.bodyMarkdown,
      });

      if (args || result.metadata) {
        return res.status(200).json({
          ...result.metadata,
          duration: result.duration,
        });
      }

      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Content-Length", result.html?.length || 0);

      return res.send(result.html);
    } else {
      logger.error(`[AllAfrica API] Failed:`, result.error);

      return res.status(500).json({
        error: "Failed to scrape AllAfrica article",
        message: result.error,
        duration: result.duration,
      });
    }
  } catch (error) {
    logger.error("[AllAfrica API] Unexpected error:", error);

    return res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
