import { IntegrationProvider } from "./types";
import { UnifiedItem } from "../types";
import { MOCK_UNIFIED_ITEMS } from "../data/mockData";

export class GitHubProvider implements IntegrationProvider {
  id = "github" as const;
  name = "GitHub";

  async sync(): Promise<UnifiedItem[]> {
    // In production with GITHUB_TOKEN:
    // Fetches pull requests and assigned issues
    return MOCK_UNIFIED_ITEMS.filter((i) => i.source === "github");
  }
}

export const githubProvider = new GitHubProvider();
