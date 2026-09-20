import { UnifiedItem, Source } from "../types";

export interface IntegrationProvider {
  id: Source;
  name: string;
  sync(): Promise<UnifiedItem[]>;
  createItem?(item: UnifiedItem): Promise<void>;
  updateItem?(item: UnifiedItem): Promise<void>;
  deleteItem?(id: string): Promise<void>;
}
