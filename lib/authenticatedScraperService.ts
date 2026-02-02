import { Browser, Page } from "puppeteer";
import { logger } from "./logger/logger";
import { PuppeteerService } from "./puppeteerService";
import { WebContentArgs, PageMetadata } from "./types";
import { ContentExtractionService } from "./contentExtractionService";

export interface AuthStep {
  type: "navigate" | "click" | "type" | "wait" | "waitForSelector" | "waitForNavigation";
  selector?: string;
  value?: string;
  url?: string;
  timeout?: number;
}

export interface ScraperAuthConfig {
  loginUrl: string;
  loginDetectionSelector: string;
  authSteps: AuthStep[];
  postAuthWaitTime?: number;
  successIndicator?: string;
}

export interface AuthenticatedScraperOptions {
  articleUrl: string;
  email: string;
  password: string;
  authConfig: ScraperAuthConfig;
  waitForSelector?: string;
  waitTime?: number;
  testMode?: boolean;
  args?: WebContentArgs;
  customContext?: Record<string, string>;
}

export interface ScraperResult {
  success: boolean;
  html?: string;
  duration?: number;
  error?: string;
  metadata?: PageMetadata;
}

function nowUnixTimestamp(): number {
  return Date.now();
}

export class AuthenticatedScraperService {
  private puppeteerService: PuppeteerService;
  private contentExtractor: ContentExtractionService;

  constructor() {
    this.puppeteerService = new PuppeteerService();
    this.contentExtractor = new ContentExtractionService();
  }

  private interpolateValue(
    value: string,
    context: Record<string, string>,
  ): string {
    return value.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      if (key in context) {
        return context[key];
      }
      logger.warn(
        `[AuthenticatedScraper] Placeholder {{${key}}} not found in context`,
      );
      return match;
    });
  }

  private async executeAuthStep(
    page: Page,
    step: AuthStep,
    context: Record<string, string>,
  ): Promise<void> {
    logger.info(`[AuthenticatedScraper] Executing auth step: ${step.type}`);

    switch (step.type) {
      case "navigate":
        if (!step.url) {
          throw new Error("Navigate step requires url");
        }
        const navigateUrl = this.interpolateValue(step.url, context);
        await page.goto(navigateUrl, {
          waitUntil: ["domcontentloaded", "networkidle2"],
          timeout: step.timeout || 30000,
        });
        logger.info(`[AuthenticatedScraper] Navigated to ${navigateUrl}`);
        break;

      case "waitForSelector":
        if (!step.selector) {
          throw new Error("waitForSelector step requires selector");
        }
        const waitSelector = this.interpolateValue(step.selector, context);

        // Support multiple selectors separated by comma (OR logic)
        const selectors = waitSelector.split(",").map((s) => s.trim());

        if (selectors.length === 1) {
          await page.waitForSelector(waitSelector, {
            timeout: step.timeout || 15000,
          });
          logger.info(
            `[AuthenticatedScraper] Found selector: ${waitSelector}`,
          );
        } else {
          // Wait for any of the selectors
          let found = false;
          const startTime = Date.now();
          const timeout = step.timeout || 15000;

          while (!found && Date.now() - startTime < timeout) {
            for (const selector of selectors) {
              try {
                const element = await page.$(selector);
                if (element) {
                  found = true;
                  logger.info(
                    `[AuthenticatedScraper] Found selector: ${selector}`,
                  );
                  break;
                }
              } catch (error) {
                // Continue to next selector
              }
            }

            if (!found) {
              await this.puppeteerService.delay(500);
            }
          }

          if (!found) {
            logger.error(
              `[AuthenticatedScraper] None of the selectors found: ${waitSelector}`,
            );
            throw new Error(
              `Waiting for any selector failed: ${waitSelector}`,
            );
          }
        }
        break;

      case "click":
        if (!step.selector) {
          throw new Error("Click step requires selector");
        }
        const clickSelector = this.interpolateValue(step.selector, context);

        try {
          await page.waitForSelector(clickSelector, { timeout: 10000 });
          await page.click(clickSelector);
          logger.info(`[AuthenticatedScraper] Clicked: ${clickSelector}`);
        } catch (error) {
          logger.error(
            `[AuthenticatedScraper] Failed to click ${clickSelector}`,
          );

          // Try to find similar elements
          const similarElements = await page.evaluate((selector) => {
            const buttons = Array.from(
              document.querySelectorAll("button, input[type=submit]"),
            );
            return buttons.map((b) => ({
              tag: b.tagName,
              type: (b as HTMLInputElement).type,
              name: (b as HTMLInputElement).name,
              className: b.className,
              id: b.id,
              text: b.textContent?.trim().substring(0, 50),
            }));
          }, clickSelector);

          logger.error(
            `[AuthenticatedScraper] Available buttons/submits:`,
            JSON.stringify(similarElements, null, 2),
          );
          throw error;
        }
        break;

      case "type":
        if (!step.selector || !step.value) {
          throw new Error("Type step requires selector and value");
        }
        const typeSelector = this.interpolateValue(step.selector, context);
        const typeValue = this.interpolateValue(step.value, context);

        try {
          await page.waitForSelector(typeSelector, { timeout: 10000 });
          await page.click(typeSelector);
          await this.puppeteerService.delay(200);
          await page.type(typeSelector, typeValue, { delay: 50 });
          logger.info(`[AuthenticatedScraper] Typed into: ${typeSelector}`);
        } catch (error) {
          logger.error(
            `[AuthenticatedScraper] Failed to type into ${typeSelector}`,
          );

          // Debug: log what's on the page
          const pageInfo = await page.evaluate(() => ({
            url: window.location.href,
            title: document.title,
            forms: Array.from(document.querySelectorAll("form")).length,
            inputs: Array.from(document.querySelectorAll("input")).map((i) => ({
              id: i.id,
              name: i.name,
              type: i.type,
            })),
          }));
          logger.error(
            `[AuthenticatedScraper] Page debug info:`,
            JSON.stringify(pageInfo, null, 2),
          );
          throw error;
        }
        break;

      case "wait":
        const waitTime = step.timeout || 2000;
        await this.puppeteerService.delay(waitTime);
        logger.info(`[AuthenticatedScraper] Waited ${waitTime}ms`);
        break;

      case "waitForNavigation":
        await page.waitForNavigation({
          waitUntil: ["domcontentloaded", "networkidle2"],
          timeout: step.timeout || 30000,
        });
        logger.info(`[AuthenticatedScraper] Navigation completed`);
        break;

      default:
        throw new Error(`Unknown auth step type: ${(step as AuthStep).type}`);
    }
  }

  private async checkIfLoginRequired(
    page: Page,
    loginDetectionSelector: string,
  ): Promise<boolean> {
    try {
      const loginElement = await page.$(loginDetectionSelector);
      if (loginElement) {
        logger.info(
          `[AuthenticatedScraper] Login form detected - authentication required`,
        );
        return true;
      } else {
        logger.info(
          `[AuthenticatedScraper] No login form found - article is public, skipping authentication`,
        );
        return false;
      }
    } catch (error) {
      logger.warn(
        `[AuthenticatedScraper] Error checking for login form, assuming public article`,
      );
      return false;
    }
  }

  private async performAuthentication(
    page: Page,
    authConfig: ScraperAuthConfig,
    context: Record<string, string>,
  ): Promise<void> {
    logger.info(`[AuthenticatedScraper] Starting authentication flow`);

    for (const step of authConfig.authSteps) {
      await this.executeAuthStep(page, step, context);
    }

    if (authConfig.successIndicator) {
      try {
        const successSelector = this.interpolateValue(
          authConfig.successIndicator,
          context,
        );
        await page.waitForSelector(successSelector, {
          timeout: 15000,
        });
        logger.info(
          `[AuthenticatedScraper] Authentication successful - found success indicator`,
        );
      } catch (error) {
        logger.warn(
          `[AuthenticatedScraper] Success indicator not found, continuing anyway`,
        );
      }
    }

    if (authConfig.postAuthWaitTime) {
      await this.puppeteerService.delay(authConfig.postAuthWaitTime);
      logger.info(
        `[AuthenticatedScraper] Post-auth wait completed (${authConfig.postAuthWaitTime}ms)`,
      );
    }
  }


  async scrapeAuthenticatedContent(
    options: AuthenticatedScraperOptions,
  ): Promise<ScraperResult> {
    const startTime = nowUnixTimestamp();
    let browser: Browser | undefined;

    try {
      const args: WebContentArgs = {
        fullHtml: options.args?.fullHtml ?? true,
        bodyMarkdown: options.args?.bodyMarkdown ?? true,
      };

      if (!args.fullHtml && !args.bodyMarkdown) {
        args.bodyMarkdown = true;
      }

      logger.info(
        `[AuthenticatedScraper] Starting scrape of ${options.articleUrl}`,
        {
          loginUrl: options.authConfig.loginUrl,
          args,
        },
      );

      browser = await this.puppeteerService.launchBrowser(options.testMode);
      const page = await browser.newPage();

      const context: Record<string, string> = {
        email: options.email,
        password: options.password,
        articleUrl: options.articleUrl,
        ...(options.customContext || {}),
      };

      await this.puppeteerService.navigateToUrl(page, {
        url: options.articleUrl,
        fastMode: false,
      });

      await this.puppeteerService.delay(3000);

      const loginRequired = await this.checkIfLoginRequired(
        page,
        options.authConfig.loginDetectionSelector,
      );

      if (loginRequired) {
        await this.performAuthentication(page, options.authConfig, context);
      } else {
        logger.info(
          `[AuthenticatedScraper] Skipping authentication - article is publicly accessible`,
        );
      }

      logger.info(
        `[AuthenticatedScraper] Content ready for extraction`,
      );

      if (options.waitForSelector) {
        try {
          await page.waitForSelector(options.waitForSelector, {
            timeout: 15000,
          });
          logger.info(
            `[AuthenticatedScraper] Selector "${options.waitForSelector}" found`,
          );
        } catch (error) {
          logger.warn(
            `[AuthenticatedScraper] Selector "${options.waitForSelector}" not found, continuing...`,
          );
        }
      }

      await page
        .waitForNetworkIdle({ timeout: 8000, idleTime: 500 })
        .catch(() => {
          logger.info(
            "[AuthenticatedScraper] Network idle timeout, continuing...",
          );
        });

      const additionalWait = options.waitTime ?? 2000;
      await this.puppeteerService.waitForFullJsLoad(page, additionalWait);

      if (options.testMode) {
        await this.puppeteerService.delay(10000);
      }

      const { html, metadata } =
        await this.contentExtractor.extractFullContent(
          page,
          options.articleUrl,
          args,
        );

      await browser.close();

      const duration = nowUnixTimestamp() - startTime;

      logger.info(
        `[AuthenticatedScraper] Content scraped in ${duration}ms (${html.length} bytes)`,
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
      logger.error("[AuthenticatedScraper] Scraping failed:", error);
      if (browser) await browser.close();

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        duration: nowUnixTimestamp() - startTime,
      };
    }
  }
}
