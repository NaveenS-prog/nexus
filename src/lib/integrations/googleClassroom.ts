import { IntegrationProvider } from "./types";
import { UnifiedItem } from "../types";
import { MOCK_UNIFIED_ITEMS } from "../data/mockData";

export class GoogleClassroomProvider implements IntegrationProvider {
  id = "google_classroom" as const;
  name = "Google Classroom";

  async sync(): Promise<UnifiedItem[]> {
    // In production with OAuth access_token:
    // Fetches courses and courseWork submissions
    return MOCK_UNIFIED_ITEMS.filter((i) => i.source === "google_classroom");
  }
}

export const googleClassroomProvider = new GoogleClassroomProvider();
