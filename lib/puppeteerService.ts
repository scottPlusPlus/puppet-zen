import puppeteer, { Browser, Page } from "puppeteer";
import path from "path";
import { logger } from "./logger/logger";

export interface PuppeteerConfig {
  viewport: { width: number; height: number };
  windowSize: string;
  imageLoadTimeout: number;
  networkIdleTimeout: number;
}

export const DEFAULT_PUPPETEER_CONFIG: PuppeteerConfig = {
  viewport: { width: 1440, height: 900 },
  windowSize: "1440,900",
  imageLoadTimeout: 190000,
  networkIdleTimeout: 30000,
};

const BROWSER_BASE_ARGS = [
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--disable-dev-shm-usage",
  "--disable-accelerated-2d-canvas",
  "--no-first-run",
  "--no-zygote",
  "--disable-extensions",
  "--disable-software-rasterizer",
] as const;

export interface NavigationOptions {
  url: string;
  authHeaders?: Record<string, string>;
  waitForSelector?: string;
  fastMode?: boolean;
}

export class PuppeteerService {
  private config: PuppeteerConfig;

  constructor(config: Partial<PuppeteerConfig> = {}) {
    this.config = { ...DEFAULT_PUPPETEER_CONFIG, ...config };
  }

  async launchBrowser(testMode = false): Promise<Browser> {
    logger.info(`[PuppeteerService] Launching browser (headless: ${!testMode})`);

    const browserArgs = [
      ...BROWSER_BASE_ARGS,
      `--window-size=${this.config.windowSize}`,
    ];

    const launchOptions: Parameters<typeof puppeteer.launch>[0] = {
      headless: !testMode,
      args: browserArgs,
      timeout: 80000,
      protocolTimeout: 300000,
    };

    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
      logger.info(
        `[PuppeteerService] Using env PUPPETEER_EXECUTABLE_PATH: ${process.env.PUPPETEER_EXECUTABLE_PATH}`,
      );
      launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    } else {
      logger.info(
        "[PuppeteerService] No PUPPETEER_EXECUTABLE_PATH set, using default",
      );
    }

    try {
      const browser = await puppeteer.launch(launchOptions);
      logger.info("[PuppeteerService] Browser launched successfully");
      return browser;
    } catch (error) {
      logger.warn(
        `[PuppeteerService] Failed to launch browser: ${
          error instanceof Error ? error.message : error
        }`,
      );
      logger.warn(
        "[PuppeteerService] Attempting to auto-detect Chrome installation...",
      );

      const chromePaths = [
        path.join(
          process.cwd(),
          "puppeteer-cache/chrome/linux-*/chrome-linux*/chrome",
        ),
        process.env.HOME +
          "/.cache/puppeteer/chrome/linux-*/chrome-linux*/chrome",
        process.env.HOME +
          "/.cache/puppeteer/chrome/mac*/chrome-mac*/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
      ];

      for (const pathPattern of chromePaths) {
        logger.info(
          `[PuppeteerService] Searching for Chrome with pattern: ${pathPattern}`,
        );
        try {
          const { execSync } = await import("child_process");
          const foundPath = execSync(`ls ${pathPattern} 2>/dev/null || echo ""`)
            .toString()
            .trim()
            .split("\n")[0];

          if (foundPath) {
            logger.info(`[PuppeteerService] Found Chrome at: ${foundPath}`);
            launchOptions.executablePath = foundPath;
            const browser = await puppeteer.launch(launchOptions);
            logger.info(
              "[PuppeteerService] Browser launched successfully with auto-detected path",
            );
            return browser;
          } else {
            logger.info(
              `[PuppeteerService] No Chrome found at pattern: ${pathPattern}`,
            );
          }
        } catch (searchError) {
          logger.warn(
            `[PuppeteerService] Error searching path ${pathPattern}: ${searchError}`,
          );
        }
      }

      logger.error(
        "[PuppeteerService] Failed to auto-detect Chrome, throwing original error",
      );
      throw error;
    }
  }

  async navigateToUrl(
    page: Page,
    options: NavigationOptions,
  ): Promise<void> {
    logger.info(`[PuppeteerService] Navigating to: ${options.url}`);

    await page.setViewport(this.config.viewport);

    if (options.authHeaders) {
      await page.setExtraHTTPHeaders(options.authHeaders);
      logger.info("[PuppeteerService] Auth headers set");
    }

    await page.goto(options.url, {
      waitUntil: options.fastMode
        ? ["domcontentloaded"]
        : ["domcontentloaded", "networkidle2"],
      timeout: this.config.imageLoadTimeout,
    });
    logger.info("[PuppeteerService] Navigation complete");
  }

  async waitForContent(
    page: Page,
    waitForSelector?: string,
  ): Promise<void> {
    logger.info("[PuppeteerService] Waiting for page content...");

    if (waitForSelector) {
      try {
        await page.waitForSelector(waitForSelector, {
          timeout: this.config.imageLoadTimeout,
        });
        logger.info(`[PuppeteerService] Selector "${waitForSelector}" found`);
      } catch (error) {
        logger.warn(
          `[PuppeteerService] Selector "${waitForSelector}" not found after ${this.config.imageLoadTimeout}ms`,
        );
        logger.info("[PuppeteerService] Continuing anyway...");
      }
    }

    await page.evaluate(() => {
      return Promise.all(
        Array.from(document.images)
          .filter((img) => !img.complete)
          .map(
            (img) =>
              new Promise((resolve) => {
                img.onload = img.onerror = resolve;
              }),
          ),
      );
    });

    await page
      .waitForNetworkIdle({ timeout: this.config.networkIdleTimeout })
      .catch(() => {
        logger.info("[PuppeteerService] Network idle timeout, continuing...");
      });

    await this.delay(2000);
    logger.info("[PuppeteerService] Content wait complete");
  }

  async waitForFullJsLoad(page: Page, additionalDelay = 2000): Promise<void> {
    logger.info("[PuppeteerService] Waiting for full JS enrichment...");

    try {
      await page.evaluate(() => {
        return new Promise<void>((resolve) => {
          const timeout = setTimeout(() => resolve(), 3000);

          if (document.readyState === "complete") {
            clearTimeout(timeout);
            resolve();
          } else {
            window.addEventListener("load", () => {
              clearTimeout(timeout);
              resolve();
            });
          }
        });
      });

      await page.evaluate(() => {
        return new Promise<void>((resolve) => {
          const timeout = setTimeout(() => resolve(), 2000);

          if (typeof window.requestIdleCallback !== "undefined") {
            window.requestIdleCallback(() => {
              clearTimeout(timeout);
              resolve();
            }, { timeout: 1500 });
          } else {
            clearTimeout(timeout);
            setTimeout(() => resolve(), 300);
          }
        });
      });

      if (additionalDelay > 0) {
        await this.delay(additionalDelay);
      }
    } catch (error) {
      logger.warn("[PuppeteerService] JS load wait interrupted, continuing...", error);
    }

    logger.info("[PuppeteerService] Full JS load complete");
  }

  delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
