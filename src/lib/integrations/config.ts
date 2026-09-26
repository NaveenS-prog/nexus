import fs from "fs";
import path from "path";
import os from "os";

export interface IntegrationCredentials {
  googleClientId?: string;
  googleClientSecret?: string;
  googleRefreshToken?: string;
  googleAccessToken?: string;
  googleTokenExpiry?: number;
  
  notionApiKey?: string;
  notionDatabaseId?: string;
}

// Support both local repo directory and serverless /tmp directory
const getCredsFilePath = () => {
  const tmpPath = path.join(os.tmpdir(), "nexus_credentials.json");
  const localPath = path.join(process.cwd(), "nexus_credentials.json");
  if (fs.existsSync(tmpPath)) return tmpPath;
  if (fs.existsSync(localPath)) return localPath;
  return tmpPath;
};

export function getStoredCredentials(overrideCreds?: Partial<IntegrationCredentials>): IntegrationCredentials {
  const envCreds: IntegrationCredentials = {
    googleClientId: process.env.GOOGLE_CLIENT_ID || undefined,
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || undefined,
    googleRefreshToken: process.env.GOOGLE_REFRESH_TOKEN || undefined,
    googleAccessToken: process.env.GOOGLE_ACCESS_TOKEN || undefined,
    notionApiKey: process.env.NOTION_API_KEY || undefined,
    notionDatabaseId: process.env.NOTION_DATABASE_ID || undefined,
  };

  let fileCreds: Partial<IntegrationCredentials> = {};
  try {
    const credsPath = getCredsFilePath();
    if (fs.existsSync(credsPath)) {
      const fileData = fs.readFileSync(credsPath, "utf-8");
      fileCreds = JSON.parse(fileData);
    }
  } catch (err) {
    // Ignore read errors
  }

  const cleanedOverride: Partial<IntegrationCredentials> = {};
  if (overrideCreds) {
    for (const [k, v] of Object.entries(overrideCreds)) {
      if (typeof v === "string" && v.trim() !== "") {
        (cleanedOverride as any)[k] = v.trim();
      } else if (typeof v === "number" && !isNaN(v)) {
        (cleanedOverride as any)[k] = v;
      }
    }
  }

  return { ...envCreds, ...fileCreds, ...cleanedOverride };
}

export function saveStoredCredentials(creds: Partial<IntegrationCredentials>): IntegrationCredentials {
  const existing = getStoredCredentials();
  const merged = { ...existing, ...creds };
  
  // Try saving to /tmp (works in serverless Vercel)
  try {
    const tmpPath = path.join(os.tmpdir(), "nexus_credentials.json");
    fs.writeFileSync(tmpPath, JSON.stringify(merged, null, 2), "utf-8");
  } catch (err) {
    // Ignore
  }

  // Also try local directory if writable
  try {
    const localPath = path.join(process.cwd(), "nexus_credentials.json");
    fs.writeFileSync(localPath, JSON.stringify(merged, null, 2), "utf-8");
  } catch (err) {
    // Ignore read-only errors on serverless
  }

  return merged;
}
