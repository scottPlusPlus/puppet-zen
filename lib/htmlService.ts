import { Browser, Page } from "puppeteer";
import { logger } from "./logger/logger";
import { PuppeteerService } from "./puppeteerService";
import { PageMetadata, WebContentArgs } from "./types";
import { MarkdownFormatter } from "./markdownFormatter";
import TurndownService from "turndown";
import crypto from "crypto";

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
  private turndownService: TurndownService;

  constructor() {
    this.puppeteerService = new PuppeteerService();
    this.turndownService = new TurndownService({
      headingStyle: "atx",
      hr: "---",
      bulletListMarker: "-",
      codeBlockStyle: "fenced",
      emDelimiter: "_",
      strongDelimiter: "**",
      linkStyle: "inlined",
      linkReferenceStyle: "full",
      preformattedCode: true,
    });

    this.turndownService.addRule("headings", {
      filter: ["h1", "h2", "h3", "h4", "h5", "h6"],
      replacement: function (content, node) {
        const hLevel = Number(node.nodeName.charAt(1));
        const hPrefix = "#".repeat(hLevel);

        const cleanContent = content.replace(/^#+\s*/, "").trim();

        if (!cleanContent) return "";

        return "\n\n" + hPrefix + " " + cleanContent + "\n\n";
      },
    });

    this.turndownService.addRule("codeBlocks", {
      filter: function (node) {
        return node.nodeName === "PRE" && node.firstChild?.nodeName === "CODE";
      },
      replacement: function (content, node) {
        const codeElement = node.firstChild as HTMLElement;
        const language =
          codeElement.className.match(/language-(\w+)/)?.[1] || "";
        const code = codeElement.textContent || "";
        return "\n\n```" + language + "\n" + code + "\n```\n\n";
      },
    });

    this.turndownService.addRule("inlineCode", {
      filter: function (node) {
        return node.nodeName === "CODE" && node.parentNode?.nodeName !== "PRE";
      },
      replacement: function (content) {
        if (!content.trim()) return "";
        return "`" + content + "`";
      },
    });

    this.turndownService.addRule("imageLinks", {
      filter: function (node) {
        return node.nodeName === "A" && node.firstChild?.nodeName === "IMG";
      },
      replacement: function (content, node) {
        const link = (node as HTMLAnchorElement).href;
        const img = node.firstChild as HTMLImageElement;
        const alt = img.alt || "";
        const src = img.src;

        return `[${alt}](${link})`;
      },
    });

    this.turndownService.addRule("tables", {
      filter: "table",
      replacement: function (content) {
        return "\n\n" + content + "\n\n";
      },
    });

    this.turndownService.remove(["script", "style", "noscript"]);

    this.turndownService.addRule("removeSvg", {
      filter: function (node) {
        return node.nodeName === "svg";
      },
      replacement: function () {
        return "";
      },
    });

    this.turndownService.keep(["br"]);
  }

  private generateHash(content: string): string {
    return crypto.createHash("md5").update(content).digest("hex");
  }

  private async extractPageMetadata(
    page: Page,
    url: string,
    html: string,
  ): Promise<Omit<PageMetadata, "fullHtml" | "bodyMarkdown">> {
    const metadata = await page.evaluate(() => {
      const getMetaContent = (name: string): string => {
        const element =
          document.querySelector(`meta[name="${name}"]`) ||
          document.querySelector(`meta[property="${name}"]`) ||
          document.querySelector(`meta[property="og:${name}"]`) ||
          document.querySelector(`meta[name="twitter:${name}"]`);
        return element?.getAttribute("content") || "";
      };

      const title =
        document.title ||
        getMetaContent("og:title") ||
        getMetaContent("twitter:title") ||
        "";

      const description =
        getMetaContent("description") ||
        getMetaContent("og:description") ||
        getMetaContent("twitter:description") ||
        "";

      const image =
        getMetaContent("og:image") ||
        getMetaContent("twitter:image") ||
        getMetaContent("image") ||
        "";

      const icon =
        (document.querySelector('link[rel="icon"]') as HTMLLinkElement)?.href ||
        (document.querySelector('link[rel="shortcut icon"]') as HTMLLinkElement)
          ?.href ||
        "";

      return {
        title,
        description,
        image,
        icon,
      };
    });

    const fullUrl = page.url();

    return {
      url,
      fullUrl,
      hash: this.generateHash(html),
      title: metadata.title,
      summary: metadata.description,
      image: metadata.image,
      icon: metadata.icon || undefined,
      fetchTimeUts: Date.now(),
    };
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

      const html = await page.content();

      const bodyHtml = await page.evaluate(() => {
        if (!document.body) return "";

        const bodyClone = document.body.cloneNode(true) as HTMLElement;

        const selectorsToRemove = [
          "script",
          "style",
          "noscript",
          "iframe",
          "svg",
          "nav",
          "header",
          "footer",
          "[role='navigation']",
          "[role='banner']",
          "[role='contentinfo']",
          ".advertisement",
          ".ad",
          ".social-share",
          ".comments",
          "button",
          "form",
        ];

        selectorsToRemove.forEach((selector) => {
          bodyClone.querySelectorAll(selector).forEach((el) => el.remove());
        });

        bodyClone
          .querySelectorAll("h1, h2, h3, h4, h5, h6")
          .forEach((heading) => {
            heading
              .querySelectorAll("h1, h2, h3, h4, h5, h6")
              .forEach((nested) => {
                const text = nested.textContent || "";
                nested.replaceWith(text);
              });

            const textNodes = Array.from(heading.childNodes).filter(
              (node) => node.nodeType === Node.TEXT_NODE,
            );
            textNodes.forEach((node) => {
              if (node.textContent) {
                node.textContent = node.textContent.replace(/^#+\s*/, "");
              }
            });
          });

        bodyClone.querySelectorAll("p, div, span").forEach((el) => {
          if (!el.textContent?.trim() && !el.querySelector("img")) {
            el.remove();
          }
        });

        return bodyClone.innerHTML;
      });

      const baseMetadata = await this.extractPageMetadata(
        page,
        options.url,
        html,
      );

      await browser.close();

      const metadata: PageMetadata = {
        ...baseMetadata,
      };

      if (args.fullHtml) {
        metadata.fullHtml = html;
      }

      if (args.bodyMarkdown) {
        let markdown = this.turndownService.turndown(bodyHtml);

        markdown = MarkdownFormatter.cleanMarkdown(markdown);

        metadata.bodyMarkdown = markdown;
      }

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
