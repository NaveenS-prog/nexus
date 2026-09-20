import { IntegrationProvider } from "./types";
import { UnifiedItem } from "../types";
import { MOCK_UNIFIED_ITEMS } from "../data/mockData";

export class GoogleCalendarProvider implements IntegrationProvider {
  id = "google_calendar" as const;
  name = "Google Calendar";

  async sync(): Promise<UnifiedItem[]> {
    // In production with OAuth access_token:
    // Fetches primary calendar events and schedules
    return MOCK_UNIFIED_ITEMS.filter((i) => i.source === "google_calendar");
  }
}

export const googleCalendarProvider = new GoogleCalendarProvider();
