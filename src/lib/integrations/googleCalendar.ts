import { IntegrationProvider } from "./types";
import { UnifiedItem } from "../types";

export class GoogleCalendarProvider implements IntegrationProvider {
  id = "google_calendar" as const;
  name = "Google Calendar";

  async sync(): Promise<UnifiedItem[]> {
    return [];
  }
}

export const googleCalendarProvider = new GoogleCalendarProvider();
