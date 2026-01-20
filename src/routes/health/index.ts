import { Router, Request, Response } from "express";
import puppeteer from "puppeteer";
import path from "path";
import { execSync } from "child_process";
import { logger } from "../../../lib/logger/logger";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
  try {
    logger.info("[Health] Health check requested");

    // Log environment info for debugging
    logger.info("[Health] Environment:", {
      NODE_ENV: process.env.NODE_ENV,
      cwd: process.cwd(),
    });

    let browserConnected = false;
    let browserVersion = "";
    let executablePath: string | undefined;

    // Try to find Chrome executable (same logic as PdfService)
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
      executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
      logger.info("[Health] Using PUPPETEER_EXECUTABLE_PATH:", executablePath);
    } else {
      // Try to auto-detect Chrome
      const chromePaths = [
        path.join(
          process.cwd(),
          "puppeteer-cache/chrome/linux-*/chrome-linux*/chrome",
        ),
        process.env.HOME +
          "/.cache/puppeteer/chrome/linux-*/chrome-linux*/chrome",
        "/opt/render/.cache/puppeteer/chrome/linux-*/chrome-linux*/chrome",
      ];

      for (const pathPattern of chromePaths) {
        try {
          const foundPath = execSync(`ls ${pathPattern} 2>/dev/null || echo ""`)
            .toString()
            .trim()
            .split("\n")[0];
          if (foundPath) {
            executablePath = foundPath;
            logger.info("[Health] Auto-detected Chrome at:", foundPath);
            break;
          }
        } catch (error) {
          // Continue searching
        }
      }
    }

    try {
      const launchOptions: Parameters<typeof puppeteer.launch>[0] = {
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
        timeout: 10000,
      };

      if (executablePath) {
        launchOptions.executablePath = executablePath;
      }

      const browser = await puppeteer.launch(launchOptions);

      browserVersion = await browser.version();
      await browser.close();
      browserConnected = true;

      logger.info("[Health] Browser check successful:", {
        browserVersion,
        executablePath,
      });
    } catch (browserError) {
      logger.warn("[Health] Browser check failed:", browserError);
      browserConnected = false;
    }

    const response = {
      status: "ok",
      timestamp: new Date().toISOString(),
      service: "puppeteer-service",
      version: "1.0.0",
      browserConnected,
      browserVersion: browserConnected ? browserVersion : undefined,
      endpoints: {
        advanced: "/api/pdf/url-to-pdf",
      },
    };

    logger.info("[Health] Health check response:", response);

    return res.status(200).json(response);
  } catch (error) {
    logger.error("[Health] Health check error:", error);

    return res.status(500).json({
      status: "error",
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
