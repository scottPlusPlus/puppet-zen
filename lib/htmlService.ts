import { Browser } from "puppeteer";
import { logger } from "./logger/logger";
import { PuppeteerService } from "./puppeteerService";

export interface HtmlGenerationOptions {
  url: string;
  waitForSelector?: string;
  waitTime?: number;
  testMode?: boolean;
}

export interface HtmlGenerationResult {
  success: boolean;
  html?: string;
  duration?: number;
  error?: string;
}

function nowUnixTimestamp(): number {
  return Date.now();
}

export class HtmlService {
  private puppeteerService: PuppeteerService;

  constructor() {
    this.puppeteerService = new PuppeteerService();
  }

  async generateHtml(
    options: HtmlGenerationOptions,
  ): Promise<HtmlGenerationResult> {
    const startTime = nowUnixTimestamp();
    let browser: Browser | undefined;

    try {
      logger.info(`[HtmlService] Generating HTML from ${options.url}`);

      browser = await this.puppeteerService.launchBrowser(options.testMode);
      const page = await browser.newPage();

      await this.puppeteerService.navigateToUrl(page, {
        url: options.url,
        waitForSelector: options.waitForSelector,
        fastMode: false,
      });

      if (options.waitForSelector) {
        try {
          await page.waitForSelector(options.waitForSelector, {
            timeout: 15000,
          });
          logger.info(`[HtmlService] Selector "${options.waitForSelector}" found`);
        } catch (error) {
          logger.warn(
            `[HtmlService] Selector "${options.waitForSelector}" not found, continuing...`,
          );
        }
      }

      await page
        .waitForNetworkIdle({ timeout: 8000, idleTime: 500 })
        .catch(() => {
          logger.info("[HtmlService] Network idle timeout, continuing...");
        });

      const additionalWait = options.waitTime ?? 2000;
      await this.puppeteerService.waitForFullJsLoad(page, additionalWait);

      if (options.testMode) {
        await this.puppeteerService.delay(10000);
      }

      const html = await page.content();
      await browser.close();

      const duration = nowUnixTimestamp() - startTime;

      logger.info(
        `[HtmlService] HTML generated in ${duration}ms (${html.length} bytes)`,
      );

      return {
        success: true,
        html,
        duration,
      };
    } catch (error) {
      logger.error("[HtmlService] Generation failed:", error);
      if (browser) await browser.close();

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        duration: nowUnixTimestamp() - startTime,
      };
    }
  }
}
