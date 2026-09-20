import { IntegrationProvider } from "./types";
import { UnifiedItem } from "../types";
import { MOCK_UNIFIED_ITEMS } from "../data/mockData";

export class NotionProvider implements IntegrationProvider {
  id = "notion" as const;
  name = "Notion";

  async sync(): Promise<UnifiedItem[]> {
    // In production with NOTION_API_KEY:
    // Queries database for pages, statuses, priority tags
    return MOCK_UNIFIED_ITEMS.filter((i) => i.source === "notion");
  }

  async createItem(item: UnifiedItem): Promise<void> {
    console.log("[NotionProvider] Appended page to database:", item.title);
  }
}

export const notionProvider = new NotionProvider();
