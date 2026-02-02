import { Browser } from "puppeteer";
import { logger } from "./logger/logger";
import { PuppeteerService } from "./puppeteerService";
import { WebContentArgs, PageMetadata } from "./types";
import { ContentExtractionService } from "./contentExtractionService";

export interface HtmlGenerationOptions {
  url: string;
  waitForSelector?: string;
  waitTime?: number;
  testMode?: boolean;
  args?: WebContentArgs;
}

export interface HtmlGenerationResult {
  success: boolean;
  html?: string;
  duration?: number;
  error?: string;
  metadata?: PageMetadata;
}

function nowUnixTimestamp(): number {
  return Date.now();
}

export class HtmlService {
  private puppeteerService: PuppeteerService;
  private contentExtractor: ContentExtractionService;

  constructor() {
    this.puppeteerService = new PuppeteerService();
    this.contentExtractor = new ContentExtractionService();
  }

  async generateHtml(
    options: HtmlGenerationOptions,
  ): Promise<HtmlGenerationResult> {
    const startTime = nowUnixTimestamp();
    let browser: Browser | undefined;

    try {
      const args: WebContentArgs = {
        fullHtml: options.args?.fullHtml ?? false,
        bodyMarkdown: options.args?.bodyMarkdown ?? true,
      };

      if (!args.fullHtml && !args.bodyMarkdown) {
        args.bodyMarkdown = true;
      }

      logger.info(`[HtmlService] Generating content from ${options.url}`, {
        args,
      });

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
          logger.info(
            `[HtmlService] Selector "${options.waitForSelector}" found`,
          );
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

      const { html, metadata } = await this.contentExtractor.extractFullContent(
        page,
        options.url,
        args,
      );

      await browser.close();

      const duration = nowUnixTimestamp() - startTime;

      logger.info(
        `[HtmlService] Content generated in ${duration}ms (${html.length} bytes)`,
        {
          hasFullHtml: !!metadata.fullHtml,
          hasBodyMarkdown: !!metadata.bodyMarkdown,
        },
      );

      return {
        success: true,
        html,
        duration,
        metadata,
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
