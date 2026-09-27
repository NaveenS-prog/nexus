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

export function maskSecret(secret?: string): string {
  if (!secret) return "";
  const trimmed = secret.trim();
  if (trimmed.length <= 8) {
    return "••••••••";
  }
  if (trimmed.startsWith("GOCSPX-")) {
    return `GOCSPX-••••••••${trimmed.slice(-4)}`;
  }
  if (trimmed.startsWith("secret_")) {
    return `secret_••••••••${trimmed.slice(-4)}`;
  }
  if (trimmed.startsWith("1//0")) {
    return `1//0••••••••${trimmed.slice(-4)}`;
  }
  if (trimmed.startsWith("ya29.")) {
    return `ya29.••••••••${trimmed.slice(-4)}`;
  }
  return `${trimmed.slice(0, 4)}••••••••${trimmed.slice(-4)}`;
}

export function maskClientId(clientId?: string): string {
  if (!clientId) return "";
  const trimmed = clientId.trim();
  if (trimmed.endsWith(".apps.googleusercontent.com")) {
    const prefix = trimmed.slice(0, 6);
    return `${prefix}••••••••.apps.googleusercontent.com`;
  }
  if (trimmed.length <= 8) return "••••••••";
  return `${trimmed.slice(0, 4)}••••••••${trimmed.slice(-4)}`;
}

function persistToDisk(creds: IntegrationCredentials): void {
  // Try saving to /tmp (works in serverless Vercel)
  try {
    const tmpPath = path.join(os.tmpdir(), "nexus_credentials.json");
    fs.writeFileSync(tmpPath, JSON.stringify(creds, null, 2), "utf-8");
  } catch (err) {
    // Ignore
  }

  // Also try local directory if writable
  try {
    const localPath = path.join(process.cwd(), "nexus_credentials.json");
    fs.writeFileSync(localPath, JSON.stringify(creds, null, 2), "utf-8");
  } catch (err) {
    // Ignore read-only errors on serverless
  }
}

export function saveStoredCredentials(creds: Partial<IntegrationCredentials>): IntegrationCredentials {
  const existing = getStoredCredentials();
  const merged: IntegrationCredentials = { ...existing };

  for (const [k, v] of Object.entries(creds)) {
    if (v === null || v === "") {
      // Explicit deletion
      delete (merged as any)[k];
    } else if (v !== undefined) {
      (merged as any)[k] = v;
    }
  }

  persistToDisk(merged);
  return merged;
}

export function clearGoogleCredentials(): IntegrationCredentials {
  const existing = getStoredCredentials();
  delete existing.googleAccessToken;
  delete existing.googleRefreshToken;
  delete existing.googleTokenExpiry;
  delete existing.googleClientId;
  delete existing.googleClientSecret;

  persistToDisk(existing);
  return existing;
}

export function clearNotionCredentials(): IntegrationCredentials {
  const existing = getStoredCredentials();
  delete existing.notionApiKey;
  delete existing.notionDatabaseId;

  persistToDisk(existing);
  return existing;
}

