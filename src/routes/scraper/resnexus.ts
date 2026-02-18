import { Router, Request, Response } from "express";
import { logger } from "../../../lib/logger/logger";
import { puppeteerUserFromReq } from "../../../lib/authUtils";
import { HotelAvailabilityCheckService } from "../../../lib/hotel-check";
import type { HotelAvailabilityOptions } from "../../../lib/hotel-check";

const router = Router();

router.post("/", async (req: Request, res: Response) => {
  try {
    const user = await puppeteerUserFromReq(req);

    if (!user) {
      logger.warn("[ResNexus API] Unauthorized");
      return res.status(401).json({ error: "Unauthorized" });
    }

    const {
      pageUrl,
      checkInDate,
      checkOutDate,
      guestCount,
      dateFormat,
      waitForSelector,
      postSearchWait,
      testMode,
      selectors,
    } = req?.body;

    if (!pageUrl) {
      return res.status(400).json({ error: "pageUrl is required" });
    }

    if (!checkInDate) {
      return res.status(400).json({ error: "checkInDate is required" });
    }

    if (!checkOutDate) {
      return res.status(400).json({ error: "checkOutDate is required" });
    }

    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);

    if (isNaN(checkIn.getTime())) {
      return res.status(400).json({ error: "checkInDate must be a valid date" });
    }

    if (isNaN(checkOut.getTime())) {
      return res.status(400).json({ error: "checkOutDate must be a valid date" });
    }

    logger.info(`[ResNexus API] Request from ${user.actorName}:`, {
      pageUrl,
      checkInDate: checkIn.toISOString(),
      checkOutDate: checkOut.toISOString(),
      guestCount,
      waitForSelector,
      postSearchWait,
      testMode,
    });

    const options: HotelAvailabilityOptions = {
      pageUrl,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      guestCount,
      dateFormat,
      waitForSelector,
      postSearchWait,
      testMode,
      selectors,
    };

    const service = new HotelAvailabilityCheckService();
    const result = await service.checkAvailability(options);

    if (result.success) {
      logger.info(`[ResNexus API] Success:`, {
        roomCount: result.rooms?.length ?? 0,
        duration: result.duration,
      });

      return res.status(200).json({
        success: true,
        rooms: result.rooms,
        searchSummary: result.searchSummary,
        duration: result.duration,
      });
    }

    logger.error(`[ResNexus API] Failed:`, result.error);

    return res.status(500).json({
      error: "Failed to check hotel availability",
      message: result.error,
      duration: result.duration,
    });
  } catch (error) {
    logger.error("[ResNexus API] Unexpected error:", error);

    return res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
