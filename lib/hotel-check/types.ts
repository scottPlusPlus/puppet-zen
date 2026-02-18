export interface HotelAvailabilityOptions {
  pageUrl: string;
  checkInDate: Date;
  checkOutDate: Date;
  guestCount?: number;
  dateFormat?: string;
  waitForSelector?: string;
  postSearchWait?: number;
  testMode?: boolean;
  selectors?: HotelAvailabilitySelectors;
}

export interface RoomAvailabilityItem {
  roomId: string;
  roomName: string;
  description: string;
  status: "available" | "unavailable" | "unknown";
  rateName?: string;
  pricePerNight?: string;
  priceTotal?: string;
}

export interface HotelAvailabilityResult {
  success: boolean;
  rooms: RoomAvailabilityItem[];
  searchSummary?: string;
  duration?: number;
  error?: string;
}

export interface HotelAvailabilitySelectors {
  startDateInput?: string;
  endDateInput?: string;
  guestsDropdownTrigger?: string;
  guestsCountInput?: string;
  searchButton?: string;
  resultsContainer?: string;
  roomCard?: string;
  roomName?: string;
  roomDescription?: string;
  rateName?: string;
  pricePerNight?: string;
  priceTotal?: string;
  addRoomButton?: string;
  occupiedButton?: string;
}

export const DEFAULT_RESNEXUS_SELECTORS: Required<HotelAvailabilitySelectors> = {
  startDateInput: "input[aria-label*='Check in date']",
  endDateInput: "input[aria-label*='Check out date']",
  guestsDropdownTrigger: ".guests-dropdown-fancy",
  guestsCountInput: ".dropdown-item[data-key='Adults'] .counter .count",
  searchButton: ".search-button",
  resultsContainer: ".searchResultsContainer",
  roomCard: ".searchResultsContainer .room-card",
  roomName: ".room-name",
  roomDescription: ".room-description",
  rateName: ".rate-name",
  pricePerNight: ".rate-price-per-night",
  priceTotal: ".rate-price-total",
  addRoomButton: ".room-action.add-room",
  occupiedButton: ".room-action.occupied",
};
