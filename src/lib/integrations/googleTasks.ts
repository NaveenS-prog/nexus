import { IntegrationProvider } from "./types";
import { UnifiedItem } from "../types";

export class GoogleTasksProvider implements IntegrationProvider {
  id = "google_tasks" as const;
  name = "Google Tasks";

  async sync(): Promise<UnifiedItem[]> {
    return [];
  }

  async createItem(item: UnifiedItem): Promise<void> {
    console.log("[GoogleTasksProvider] Created item:", item.title);
  }

  async updateItem(item: UnifiedItem): Promise<void> {
    console.log("[GoogleTasksProvider] Updated item status:", item.title, item.status);
  }

  async deleteItem(id: string): Promise<void> {
    console.log("[GoogleTasksProvider] Deleted item:", id);
  }
}

export const googleTasksProvider = new GoogleTasksProvider();
