import { IntegrationProvider } from "./types";
import { UnifiedItem } from "../types";

export class GoogleClassroomProvider implements IntegrationProvider {
  id = "google_classroom" as const;
  name = "Google Classroom";

  async sync(): Promise<UnifiedItem[]> {
    return [];
  }
}

export const googleClassroomProvider = new GoogleClassroomProvider();
