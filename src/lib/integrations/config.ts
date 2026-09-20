import fs from "fs";
import path from "path";

export interface IntegrationCredentials {
  googleClientId?: string;
  googleClientSecret?: string;
  googleRefreshToken?: string;
  googleAccessToken?: string;
  googleTokenExpiry?: number;
  
  notionApiKey?: string;
  notionDatabaseId?: string;
}

const CREDENTIALS_FILE_PATH = path.join(process.cwd(), "nexus_credentials.json");

export function getStoredCredentials(): IntegrationCredentials {
  const envCreds: IntegrationCredentials = {
    googleClientId: process.env.GOOGLE_CLIENT_ID || undefined,
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || undefined,
    googleRefreshToken: process.env.GOOGLE_REFRESH_TOKEN || undefined,
    googleAccessToken: process.env.GOOGLE_ACCESS_TOKEN || undefined,
    notionApiKey: process.env.NOTION_API_KEY || undefined,
    notionDatabaseId: process.env.NOTION_DATABASE_ID || undefined,
  };

  try {
    if (fs.existsSync(CREDENTIALS_FILE_PATH)) {
      const fileData = fs.readFileSync(CREDENTIALS_FILE_PATH, "utf-8");
      const parsed = JSON.parse(fileData);
      return { ...envCreds, ...parsed };
    }
  } catch (err) {
    console.warn("Could not read credentials file:", err);
  }

  return envCreds;
}

export function saveStoredCredentials(creds: Partial<IntegrationCredentials>): IntegrationCredentials {
  const existing = getStoredCredentials();
  const merged = { ...existing, ...creds };
  try {
    fs.writeFileSync(CREDENTIALS_FILE_PATH, JSON.stringify(merged, null, 2), "utf-8");
  } catch (err) {
    console.error("Could not write credentials file:", err);
  }
  return merged;
}
