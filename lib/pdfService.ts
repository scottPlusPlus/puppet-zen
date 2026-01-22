import { Browser, Page } from "puppeteer";
import fs from "fs";
import path from "path";
import { logger } from "./logger/logger";
import { PuppeteerService } from "./puppeteerService";

export const PDF_AUTH_HEADER = "x-pdf-access-token";

export interface PdfGenerationOptions {
  url: string;
  filename?: string;
  pdfAuthToken?: string | null;
  testMode?: boolean;
}

export interface PdfGenerationResult {
  success: boolean;
  filePath?: string;
  filename?: string;
  size?: number;
  duration?: number;
  error?: string;
}

interface ImageCheckResult {
  totalImages: number;
  brokenCount: number;
  logs: string[];
  brokenImages: string[];
}

const PDF_CONFIG = {
  WIDTH: "1440px",
  HEIGHT: "900px",
  VIEWPORT: { width: 1440, height: 900 },
  MARGINS: { top: "5mm", right: "10mm", bottom: "5mm", left: "10mm" },
  BACKGROUND_COLOR: "#EDEFF2",
  VMS_LOGO_URL: "https://www.validatemysaas.com/images/vms_logo.svg",
  ICON_SIZE_THRESHOLD: 50,
  IMAGE_LOAD_TIMEOUT: 190000,
  NETWORK_IDLE_TIMEOUT: 30000,
  REPLACEMENT_IMAGE_WAIT: 3000,
} as const;


const TEXT_ELEMENTS: (keyof HTMLElementTagNameMap)[] = [
  "p",
  "span",
  "div",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "li",
  "td",
  "th",
  "label",
  "a",
] as const;

const SELECTORS = {
  firstPage: ['[data-section="your-idea"]', '[data-section="overview"]'],
  newPage: [
    '[data-section="idea-advisor"]',
    '[data-section="seo"]',
    '[data-section="other-competitors"]',
  ],
  overviewCards: '[data-overview-cards="true"]',
  competitorsContainer: '[data-competitors-container="true"]',
  competitorItem: '[data-competitor-item="true"]',
  productCard: '[data-product-card="true"]',
  productCardsContainer: '[data-product-cards-container="true"]',
  pdfContent: '[data-pdf-content="true"]',
} as const;

function nowUnixTimestamp(): number {
  return Date.now();
}

export class PdfService {
  private readonly pdfsDir: string;
  private puppeteerService: PuppeteerService;

  constructor() {
    this.pdfsDir = path.join(process.cwd(), "generated-pdfs");
    this.puppeteerService = new PuppeteerService({
      viewport: PDF_CONFIG.VIEWPORT,
      windowSize: `${PDF_CONFIG.VIEWPORT.width},${PDF_CONFIG.VIEWPORT.height}`,
      imageLoadTimeout: PDF_CONFIG.IMAGE_LOAD_TIMEOUT,
      networkIdleTimeout: PDF_CONFIG.NETWORK_IDLE_TIMEOUT,
    });
    this.ensureDirectoryExists();
  }

  async generatePdf(
    options: PdfGenerationOptions,
  ): Promise<PdfGenerationResult> {
    const startTime = nowUnixTimestamp();
    let browser: Browser | undefined;

    try {
      logger.info(`[PdfService] Generating PDF from ${options.url}`);

      browser = await this.puppeteerService.launchBrowser(options.testMode);
      const page = await browser.newPage();

      const authHeaders = options.pdfAuthToken
        ? { [PDF_AUTH_HEADER]: options.pdfAuthToken }
        : undefined;

      await this.puppeteerService.navigateToUrl(page, {
        url: options.url,
        authHeaders,
        waitForSelector: SELECTORS.productCardsContainer,
      });

      await this.puppeteerService.waitForContent(
        page,
        SELECTORS.productCardsContainer,
      );

      await this.preparePdfContent(page);

      if (options.testMode) {
        await this.puppeteerService.delay(10000);
      }

      const pdfBuffer = await this.generatePdfBuffer(page);
      await browser.close();

      const filePath = this.savePdf(pdfBuffer, options.filename || "test");
      const duration = nowUnixTimestamp() - startTime;

      logger.info(
        `[PdfService] PDF generated in ${duration}ms (${pdfBuffer.length} bytes)`,
      );

      return {
        success: true,
        filePath,
        filename: options.filename || "test",
        size: pdfBuffer.length,
        duration,
      };
    } catch (error) {
      logger.error("[PdfService] Generation failed:", error);
      if (browser) await browser.close();

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        duration: nowUnixTimestamp() - startTime,
      };
    }
  }


  private async preparePdfContent(page: Page): Promise<void> {
    const imageResults = await this.replacebrokenImages(page);

    if (imageResults.brokenCount > 0) {
      logger.warn(
        `[PdfService] Replaced ${imageResults.brokenCount} broken images`,
      );
      imageResults.brokenImages.forEach((img) => logger.warn(`  - ${img}`));
    }

    await this.applyPdfStyles(page);
    await this.puppeteerService.delay(PDF_CONFIG.REPLACEMENT_IMAGE_WAIT);
  }

  private async replacebrokenImages(page: Page): Promise<ImageCheckResult> {
    return page.evaluate(
      (config) => {
        const allImages = document.querySelectorAll("img");
        const imageLog: string[] = [];
        const brokenImages: string[] = [];

        const isIconElement = (img: HTMLImageElement): boolean => {
          const width = img.width || img.naturalWidth;
          const height = img.height || img.naturalHeight;

          return (
            (width > 0 &&
              width < config.iconThreshold &&
              height > 0 &&
              height < config.iconThreshold) ||
            img.classList.contains("icon") ||
            img.classList.contains("emoji") ||
            !!img.closest('[class*="icon"]') ||
            !!img.closest('[class*="Icon"]')
          );
        };

        const replaceWithLogo = (img: HTMLImageElement): void => {
          img.src = config.logoUrl;
          img.alt = "VMS Logo";
          img.style.display = "block";
          img.style.maxWidth = "200px";
          img.style.height = "auto";
        };

        return Promise.all(
          Array.from(allImages).map(async (img) => {
            const originalSrc = img.src;

            if (isIconElement(img)) {
              imageLog.push(`SKIP: ${originalSrc}`);
              return;
            }

            try {
              const response = await fetch(originalSrc, { method: "HEAD" });

              if (!response.ok) {
                imageLog.push(`FAILED (${response.status}): ${originalSrc}`);
                brokenImages.push(`${originalSrc} (HTTP ${response.status})`);
                replaceWithLogo(img);
              }
            } catch (error) {
              const errorMsg =
                error instanceof Error ? error.message : String(error);
              imageLog.push(`ERROR: ${originalSrc} - ${errorMsg}`);
              brokenImages.push(`${originalSrc} (${errorMsg})`);
              replaceWithLogo(img);
            }
          }),
        ).then(() => ({
          totalImages: allImages.length,
          brokenCount: brokenImages.length,
          logs: imageLog,
          brokenImages,
        }));
      },
      {
        logoUrl: PDF_CONFIG.VMS_LOGO_URL,
        iconThreshold: PDF_CONFIG.ICON_SIZE_THRESHOLD,
      },
    );
  }

  private async applyPdfStyles(page: Page): Promise<void> {
    await page.evaluate(
      (config) => {
        const applyBackgroundColor = (): void => {
          document.documentElement.style.backgroundColor = config.bgColor;
          document.body.style.backgroundColor = config.bgColor;

          const mainContainer = document.querySelector(
            config.selectors.pdfContent,
          );
          if (mainContainer) {
            (mainContainer as HTMLElement).style.backgroundColor =
              config.bgColor;
          }
        };

        const createPdfHeader = (): void => {
          const header = document.createElement("div");
          Object.assign(header.style, {
            backgroundColor: config.bgColor,
            padding: "20px 40px",
            borderBottom: "2px solid #C6C8CD",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
          });

          const title = document.createElement("h1");
          title.textContent = "VMS Generated PDF";
          Object.assign(title.style, {
            margin: "0",
            fontSize: "24px",
            fontWeight: "bold",
            color: "#293041",
          });

          const timestamp = document.createElement("div");
          timestamp.textContent = new Date().toLocaleString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          });
          Object.assign(timestamp.style, {
            fontSize: "14px",
            color: "#777C87",
          });

          header.appendChild(title);
          header.appendChild(timestamp);
          document.body.insertBefore(header, document.body.firstChild);
        };

        const applyPageBreaks = (
          selectors: readonly string[],
          breakBefore: "auto" | "always",
          breakInside: "auto" | "avoid",
        ): void => {
          selectors.forEach((selector) => {
            const element = document.querySelector(selector) as HTMLElement;
            if (element) {
              element.style.pageBreakBefore = breakBefore;
              element.style.pageBreakInside = breakInside;
              element.style.breakBefore =
                breakBefore === "always" ? "page" : "auto";
              element.style.breakInside = breakInside;
            }
          });
        };

        const configureOverviewCards = (): void => {
          const cards = document.querySelector(
            config.selectors.overviewCards,
          ) as HTMLElement;
          if (cards) {
            Object.assign(cards.style, {
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "1.5rem",
            });
          }
        };

        const configureCompetitors = (): void => {
          const container = document.querySelector(
            config.selectors.competitorsContainer,
          ) as HTMLElement;
          if (!container) return;

          Object.assign(container.style, {
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
          });

          const items = document.querySelectorAll(
            config.selectors.competitorItem,
          );
          items.forEach((item, index) => {
            const el = item as HTMLElement;
            if (index > 0 && index % 12 === 0) {
              el.style.pageBreakBefore = "always";
              el.style.breakBefore = "page";
            }
            el.style.pageBreakInside = "avoid";
            el.style.breakInside = "avoid";
          });
        };

        const isSvgOrIcon = (element: Element): boolean => {
          const tag = element.tagName.toLowerCase();
          return (
            tag === "svg" ||
            !!element.closest("svg") ||
            tag.includes("path") ||
            tag.includes("circle") ||
            tag.includes("rect") ||
            element.classList.contains("icon") ||
            element.classList.contains("Icon") ||
            !!element.closest('[class*="icon"]') ||
            !!element.closest('[class*="Icon"]')
          );
        };

        const configureProductCards = (): void => {
          const cards = document.querySelectorAll(config.selectors.productCard);

          cards.forEach((card) => {
            const el = card as HTMLElement;

            Object.assign(el.style, {
              pageBreakBefore: "always",
              pageBreakAfter: "auto",
              breakBefore: "page",
              breakAfter: "auto",
              pageBreakInside: "auto",
              breakInside: "auto",
              maxHeight: "none",
              overflow: "visible",
            });

            el.querySelectorAll("*").forEach((child) => {
              if (isSvgOrIcon(child)) return;

              const childEl = child as HTMLElement;
              Object.assign(childEl.style, {
                pageBreakInside: "auto",
                breakInside: "auto",
                overflow: "visible",
              });
            });
          });
        };

        const ensureTextVisibility = (): void => {
          document.querySelectorAll("body *").forEach((el) => {
            if (isSvgOrIcon(el)) return;

            const element = el as HTMLElement;
            const tag =
              element.tagName.toLowerCase() as keyof HTMLElementTagNameMap;

            if (config.textElements.includes(tag)) {
              element.style.overflow = "visible";
              element.style.textOverflow = "clip";

              const color = window.getComputedStyle(element).color;
              if (color === "rgba(0, 0, 0, 0)" || color === "transparent") {
                element.style.color = "#293041";
              }
            }
          });
        };

        const ensureSvgVisibility = (): void => {
          document.querySelectorAll("svg").forEach((svg) => {
            Object.assign((svg as SVGElement).style, {
              visibility: "visible",
              display: "inline-block",
              opacity: "1",
            });
          });
        };

        applyBackgroundColor();
        createPdfHeader();
        applyPageBreaks(config.selectors.firstPage, "auto", "avoid");
        applyPageBreaks(config.selectors.newPage, "always", "avoid");
        configureOverviewCards();
        configureCompetitors();
        configureProductCards();
        ensureTextVisibility();
        ensureSvgVisibility();
      },
      {
        bgColor: PDF_CONFIG.BACKGROUND_COLOR,
        selectors: SELECTORS,
        textElements: TEXT_ELEMENTS,
      },
    );
  }

  private async generatePdfBuffer(page: Page): Promise<Uint8Array> {
    await page.addStyleTag({
      content: `html, body { background: ${PDF_CONFIG.BACKGROUND_COLOR} !important; }`,
    });

    return page.pdf({
      width: PDF_CONFIG.WIDTH,
      height: PDF_CONFIG.HEIGHT,
      printBackground: true,
      margin: PDF_CONFIG.MARGINS,
      displayHeaderFooter: false,
      preferCSSPageSize: false,
    });
  }

  private savePdf(buffer: Uint8Array, filename: string): string {
    const filePath = path.join(this.pdfsDir, filename);
    fs.writeFileSync(filePath, buffer);
    return filePath;
  }

  private ensureDirectoryExists(): void {
    if (!fs.existsSync(this.pdfsDir)) {
      fs.mkdirSync(this.pdfsDir, { recursive: true });
    }
    this.cleanupOldPdfs();
  }

  private cleanupOldPdfs(): void {
    try {
      const files = fs.readdirSync(this.pdfsDir);
      const now = nowUnixTimestamp();
      const maxAge = 24 * 60 * 60 * 1000;

      const deleted = files.filter((file) => {
        const filePath = path.join(this.pdfsDir, file);
        const stats = fs.statSync(filePath);
        if (now - stats.mtimeMs > maxAge) {
          fs.unlinkSync(filePath);
          return true;
        }
        return false;
      });

      if (deleted.length > 0) {
        logger.info(`[PdfService] Cleaned up ${deleted.length} old PDF(s)`);
      }
    } catch (error) {
      logger.error("[PdfService] Cleanup failed:", error);
    }
  }

}
