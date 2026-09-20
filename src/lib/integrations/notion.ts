import { IntegrationProvider } from "./types";
import { UnifiedItem } from "../types";

export class NotionProvider implements IntegrationProvider {
  id = "notion" as const;
  name = "Notion";

  async sync(): Promise<UnifiedItem[]> {
    return [];
  }

  async createItem(item: UnifiedItem): Promise<void> {
    console.log("[NotionProvider] Appended page to database:", item.title);
  }
}

export const notionProvider = new NotionProvider();
