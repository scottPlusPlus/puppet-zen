import { Page } from "puppeteer";
import { logger } from "./logger/logger";
import { PageMetadata, WebContentArgs } from "./types";
import { MarkdownFormatter } from "./markdownFormatter";
import TurndownService from "turndown";
import crypto from "crypto";

export class ContentExtractionService {
  private turndownService: TurndownService;

  constructor() {
    this.turndownService = this.initializeTurndownService();
  }

  private initializeTurndownService(): TurndownService {
    const service = new TurndownService({
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

    service.addRule("headings", {
      filter: ["h1", "h2", "h3", "h4", "h5", "h6"],
      replacement: function (content, node) {
        const hLevel = Number(node.nodeName.charAt(1));
        const hPrefix = "#".repeat(hLevel);
        const cleanContent = content.replace(/^#+\s*/, "").trim();
        if (!cleanContent) return "";
        return "\n\n" + hPrefix + " " + cleanContent + "\n\n";
      },
    });

    service.addRule("codeBlocks", {
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

    service.addRule("inlineCode", {
      filter: function (node) {
        return node.nodeName === "CODE" && node.parentNode?.nodeName !== "PRE";
      },
      replacement: function (content) {
        if (!content.trim()) return "";
        return "`" + content + "`";
      },
    });

    service.addRule("imageLinks", {
      filter: function (node) {
        return node.nodeName === "A" && node.firstChild?.nodeName === "IMG";
      },
      replacement: function (content, node) {
        const link = (node as HTMLAnchorElement).href;
        const img = node.firstChild as HTMLImageElement;
        const alt = img.alt || "";
        return `[${alt}](${link})`;
      },
    });

    service.addRule("tables", {
      filter: "table",
      replacement: function (content) {
        return "\n\n" + content + "\n\n";
      },
    });

    service.remove(["script", "style", "noscript"]);

    service.addRule("removeSvg", {
      filter: function (node) {
        return node.nodeName === "svg";
      },
      replacement: function () {
        return "";
      },
    });

    service.keep(["br"]);

    return service;
  }

  private generateHash(content: string): string {
    return crypto.createHash("md5").update(content).digest("hex");
  }

  async extractPageMetadata(
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

  async extractCleanBodyHtml(page: Page): Promise<string> {
    return await page.evaluate(() => {
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
  }

  convertToMarkdown(html: string): string {
    let markdown = this.turndownService.turndown(html);
    markdown = MarkdownFormatter.cleanMarkdown(markdown);
    return markdown;
  }

  async extractFullContent(
    page: Page,
    url: string,
    args: WebContentArgs,
  ): Promise<{ html: string; metadata: PageMetadata }> {
    logger.info(`[ContentExtraction] Extracting content from ${url}`, { args });

    const html = await page.content();
    const bodyHtml = await this.extractCleanBodyHtml(page);
    const baseMetadata = await this.extractPageMetadata(page, url, html);

    const metadata: PageMetadata = {
      ...baseMetadata,
    };

    if (args.fullHtml) {
      metadata.fullHtml = html;
    }

    if (args.bodyMarkdown) {
      metadata.bodyMarkdown = this.convertToMarkdown(bodyHtml);
    }

    logger.info(
      `[ContentExtraction] Content extracted (${html.length} bytes)`,
      {
        hasFullHtml: !!metadata.fullHtml,
        hasBodyMarkdown: !!metadata.bodyMarkdown,
      },
    );

    return { html, metadata };
  }
}
