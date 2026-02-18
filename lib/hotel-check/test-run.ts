import { HotelAvailabilityCheckService } from "./hotel-availability-check";
import type { HotelAvailabilityResult } from "./types";

const TEST_URL =
  "https://resnexus.com/resnexus/reservations/book/31CA0F44-3824-414D-8838-ABF93CF5A3D6";

function logResult(label: string, result: HotelAvailabilityResult): void {
  console.log(`\n--- ${label} ---`);
  console.log("Success:", result.success);
  console.log("Duration:", result.duration, "ms");
  if (result.searchSummary) {
    console.log("Search summary:", result.searchSummary);
  }
  console.log("Rooms found:", result.rooms.length);

  if (result.error) {
    console.error("Error:", result.error);
  }

  result.rooms.forEach((room, i) => {
    console.log(
      `  ${i + 1}. [${room.roomId}] ${room.roomName} - ${room.status} - ${room.pricePerNight ?? "N/A"}`
    );
  });

  console.log("--------------------------------------");
}

async function main(): Promise<void> {
  const checkIn = new Date();
  checkIn.setDate(checkIn.getDate() + 30);

  const checkOut = new Date(checkIn);
  checkOut.setDate(checkOut.getDate() + 3);

  const service = new HotelAvailabilityCheckService();

  try {
    const result1 = await service.checkAvailability({
      pageUrl: TEST_URL,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      testMode: true,
    });
    logResult("Hotel Availability Check Result (1 guest)", result1);

    const result2 = await service.checkAvailability({
      pageUrl: TEST_URL,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      guestCount: 3,
      testMode: true,
    });
    logResult("Hotel Availability Check Result (3 guests)", result2);

    const allSuccess = result1.success && result2.success;
    process.exit(allSuccess ? 0 : 1);
  } catch (err) {
    console.error("Fatal error:", err);
    process.exit(1);
  }
}

main();
