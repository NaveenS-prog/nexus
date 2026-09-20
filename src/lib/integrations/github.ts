import { IntegrationProvider } from "./types";
import { UnifiedItem } from "../types";

export class GitHubProvider implements IntegrationProvider {
  id = "github" as const;
  name = "GitHub";

  async sync(): Promise<UnifiedItem[]> {
    return [];
  }
}

export const githubProvider = new GitHubProvider();
