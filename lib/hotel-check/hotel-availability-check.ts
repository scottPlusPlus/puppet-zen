import { Browser, Page } from "puppeteer";
import { logger } from "../logger/logger";
import { PuppeteerService } from "../puppeteerService";
import {
  HotelAvailabilityOptions,
  HotelAvailabilityResult,
  RoomAvailabilityItem,
  DEFAULT_RESNEXUS_SELECTORS,
} from "./types";

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function nowUnixTimestamp(): number {
  return Date.now();
}

export class HotelAvailabilityCheckService {
  private puppeteerService: PuppeteerService;

  constructor() {
    this.puppeteerService = new PuppeteerService();
  }

  async checkAvailability(
    options: HotelAvailabilityOptions,
  ): Promise<HotelAvailabilityResult> {
    const startTime = nowUnixTimestamp();
    let browser: Browser | undefined;

    try {
      const selectors = {
        ...DEFAULT_RESNEXUS_SELECTORS,
        ...options.selectors,
      };
      const dateFormat = options.dateFormat ?? "MMM d, yyyy";
      const postSearchWait = options.postSearchWait ?? 2000;

      logger.info(
        `[HotelAvailabilityCheck] Starting check for ${options.pageUrl}`,
        {
          checkIn: options.checkInDate.toISOString(),
          checkOut: options.checkOutDate.toISOString(),
        },
      );

      browser = await this.puppeteerService.launchBrowser(
        options.testMode ?? false,
      );
      const page = await browser.newPage();

      await this.puppeteerService.navigateToUrl(page, {
        url: options.pageUrl,
        fastMode: false,
      });

      await this.puppeteerService.delay(3000);

      if (options.waitForSelector) {
        try {
          await page.waitForSelector(options.waitForSelector, {
            timeout: 15000,
          });
          logger.info(
            `[HotelAvailabilityCheck] Selector "${options.waitForSelector}" found`,
          );
        } catch (error) {
          logger.warn(
            `[HotelAvailabilityCheck] Selector "${options.waitForSelector}" not found, continuing...`,
          );
        }
      }

      await this.fillDateInputs(page, options.checkInDate, options.checkOutDate, selectors, dateFormat);
      await this.puppeteerService.delay(500);
      await this.fillGuestCount(page, options.guestCount ?? 1, selectors);
      await this.puppeteerService.delay(500);
      await this.triggerSearch(page, selectors);
      await this.waitForRoomResults(page, selectors);
      await this.puppeteerService.waitForFullJsLoad(page, postSearchWait);

      const rooms = await this.extractRooms(page, selectors);
      const searchSummary = await this.extractSearchSummary(page);

      await browser.close();

      const duration = nowUnixTimestamp() - startTime;

      logger.info(
        `[HotelAvailabilityCheck] Extracted ${rooms.length} rooms in ${duration}ms`,
      );

      return {
        success: true,
        rooms,
        searchSummary,
        duration,
      };
    } catch (error) {
      logger.error("[HotelAvailabilityCheck] Check failed:", error);
      if (browser) await browser.close();

      return {
        success: false,
        rooms: [],
        error: error instanceof Error ? error.message : "Unknown error",
        duration: nowUnixTimestamp() - startTime,
      };
    }
  }

  private formatDateForInput(date: Date, format: string): string {
    if (format === "MMM d, yyyy") {
      const month = MONTH_NAMES[date.getMonth()];
      const day = date.getDate();
      const year = date.getFullYear();
      return `${month} ${day}, ${year}`;
    }
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  private async fillGuestCount(
    page: Page,
    guestCount: number,
    selectors: typeof DEFAULT_RESNEXUS_SELECTORS,
  ): Promise<void> {
    if (guestCount === 1) return;

    logger.info(`[HotelAvailabilityCheck] Setting guest count to ${guestCount}`);

    const trigger = await page.$(selectors.guestsDropdownTrigger);
    if (!trigger) {
      logger.warn("[HotelAvailabilityCheck] Guests dropdown trigger not found, skipping guest count");
      return;
    }

    await trigger.click();
    await this.puppeteerService.delay(300);

    await page.waitForSelector(selectors.guestsCountInput, { timeout: 5000 }).catch(() => null);
    if (!(await page.$(selectors.guestsCountInput))) {
      logger.warn("[HotelAvailabilityCheck] Guests count input not found, skipping");
      return;
    }

    const clamped = Math.max(0, Math.min(40, guestCount));

    await page.evaluate(
      ({ sel, val }: { sel: string; val: number }) => {
        const el = document.querySelector(sel) as HTMLInputElement;
        if (el) {
          el.focus();
          el.value = String(val);
          el.dispatchEvent(new Event("input", { bubbles: true }));
          el.dispatchEvent(new Event("change", { bubbles: true }));
        }
      },
      { sel: selectors.guestsCountInput, val: clamped },
    );

    await this.puppeteerService.delay(200);

    const applyBtn = await page.$(".guests-dropdown-content .save-button");
    if (applyBtn) {
      await applyBtn.click();
    }

    await this.puppeteerService.delay(300);
  }

  private async fillDateInputs(
    page: Page,
    checkIn: Date,
    checkOut: Date,
    selectors: typeof DEFAULT_RESNEXUS_SELECTORS,
    dateFormat: string,
  ): Promise<void> {
    const startStr = this.formatDateForInput(checkIn, dateFormat);
    const endStr = this.formatDateForInput(checkOut, dateFormat);

    logger.info(`[HotelAvailabilityCheck] Filling dates: ${startStr} - ${endStr}`);

    await page.waitForSelector(selectors.startDateInput, { timeout: 15000 });

    await page.evaluate(
      ({ sel, val }: { sel: string; val: string }) => {
        const el = document.querySelector(sel) as HTMLInputElement;
        if (el) {
          el.focus();
          el.value = val;
          el.dispatchEvent(new Event("input", { bubbles: true }));
          el.dispatchEvent(new Event("change", { bubbles: true }));
        }
      },
      { sel: selectors.startDateInput, val: startStr },
    );
    await this.puppeteerService.delay(300);

    await page.evaluate(
      ({ sel, val }: { sel: string; val: string }) => {
        const el = document.querySelector(sel) as HTMLInputElement;
        if (el) {
          el.focus();
          el.value = val;
          el.dispatchEvent(new Event("input", { bubbles: true }));
          el.dispatchEvent(new Event("change", { bubbles: true }));
        }
      },
      { sel: selectors.endDateInput, val: endStr },
    );
    await this.puppeteerService.delay(300);
  }

  private async triggerSearch(
    page: Page,
    selectors: typeof DEFAULT_RESNEXUS_SELECTORS,
  ): Promise<void> {
    logger.info("[HotelAvailabilityCheck] Triggering search");

    const searchBtn = await page.$(selectors.searchButton);
    if (searchBtn) {
      await searchBtn.click();
    } else {
      logger.warn("[HotelAvailabilityCheck] Search button not found, trying filter-search");
      const altBtn = await page.$(".filter-search .search-button");
      if (altBtn) {
        await altBtn.click();
      } else {
        throw new Error("Search button not found");
      }
    }
  }

  private async waitForRoomResults(
    page: Page,
    selectors: typeof DEFAULT_RESNEXUS_SELECTORS,
    timeout = 15000,
  ): Promise<void> {
    logger.info("[HotelAvailabilityCheck] Waiting for room results");

    try {
      await page.waitForSelector(selectors.roomCard, { timeout });
    } catch (error) {
      const hasNoResults = await page.evaluate(() => {
        const container = document.querySelector(".searchResultsContainer");
        return container && !container.querySelector(".room-card");
      });
      if (hasNoResults) {
        logger.info("[HotelAvailabilityCheck] No room cards found (possibly no availability)");
        return;
      }
      throw error;
    }

    await page
      .waitForNetworkIdle({ timeout: 8000, idleTime: 500 })
      .catch(() => {
        logger.info("[HotelAvailabilityCheck] Network idle timeout, continuing...");
      });
  }

  private async extractRooms(
    page: Page,
    selectors: typeof DEFAULT_RESNEXUS_SELECTORS,
  ): Promise<RoomAvailabilityItem[]> {
    return page.evaluate((sel) => {
      const container = document.querySelector(sel.resultsContainer);
      if (!container) return [];

      const cards = container.querySelectorAll(".room-card");
      return Array.from(cards).map((card) => {
        const id = card.getAttribute("data-id") ?? "";
        const nameEl = card.querySelector(sel.roomName);
        const descEl = card.querySelector(sel.roomDescription);
        const rateNameEl = card.querySelector(sel.rateName);
        const priceNightEl = card.querySelector(sel.pricePerNight);
        const priceTotalEl = card.querySelector(sel.priceTotal);
        const addBtn = card.querySelector(sel.addRoomButton);
        const occupiedBtn = card.querySelector(sel.occupiedButton);

        let status: "available" | "unavailable" | "unknown" = "unknown";
        if (addBtn) status = "available";
        else if (occupiedBtn) status = "unavailable";

        return {
          roomId: id,
          roomName: nameEl?.textContent?.trim() ?? "",
          description: descEl?.textContent?.trim() ?? "",
          status,
          rateName: rateNameEl?.textContent?.trim() ?? undefined,
          pricePerNight: priceNightEl?.textContent?.trim() ?? undefined,
          priceTotal: priceTotalEl?.textContent?.trim() ?? undefined,
        };
      });
    }, selectors);
  }

  private async extractSearchSummary(page: Page): Promise<string | undefined> {
    return page.evaluate(() => {
      const el = document.querySelector(".infoAlert.currentSearchFiltersInfo");
      return el?.textContent?.trim();
    });
  }
}
