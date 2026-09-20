import { IntegrationProvider } from "./types";
import { UnifiedItem } from "../types";
import { MOCK_UNIFIED_ITEMS } from "../data/mockData";

export class GoogleTasksProvider implements IntegrationProvider {
  id = "google_tasks" as const;
  name = "Google Tasks";

  async sync(): Promise<UnifiedItem[]> {
    // In production with OAuth access_token:
    // Fetches from https://tasks.googleapis.com/tasks/v1/users/@me/lists
    // For demo/offline: returns cached normalized Google Tasks
    return MOCK_UNIFIED_ITEMS.filter((i) => i.source === "google_tasks");
  }

  async createItem(item: UnifiedItem): Promise<void> {
    // Upstream POST to Google Tasks API
    console.log("[GoogleTasksProvider] Created item:", item.title);
  }

  async updateItem(item: UnifiedItem): Promise<void> {
    // Upstream PATCH to Google Tasks API
    console.log("[GoogleTasksProvider] Updated item status:", item.title, item.status);
  }

  async deleteItem(id: string): Promise<void> {
    // Upstream DELETE from Google Tasks API
    console.log("[GoogleTasksProvider] Deleted item:", id);
  }
}

export const googleTasksProvider = new GoogleTasksProvider();
