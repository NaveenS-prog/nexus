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

function getLocalCredsPath(): string {
  return path.join(process.cwd(), "nexus_credentials.json");
}

function getTmpCredsPath(): string {
  return path.join(os.tmpdir(), "nexus_credentials.json");
}

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

  // 1. Read from local directory
  try {
    const localPath = getLocalCredsPath();
    if (fs.existsSync(localPath)) {
      const fileData = fs.readFileSync(localPath, "utf-8");
      fileCreds = { ...fileCreds, ...JSON.parse(fileData) };
    }
  } catch (err) {
    // Ignore read errors
  }

  // 2. Read from tmp directory (merged)
  try {
    const tmpPath = getTmpCredsPath();
    if (fs.existsSync(tmpPath)) {
      const fileData = fs.readFileSync(tmpPath, "utf-8");
      fileCreds = { ...fileCreds, ...JSON.parse(fileData) };
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
  const localPath = getLocalCredsPath();
  const tmpPath = getTmpCredsPath();

  // Try saving to local directory
  try {
    fs.writeFileSync(localPath, JSON.stringify(creds, null, 2), "utf-8");
  } catch (err) {
    // Ignore read-only errors on serverless
  }

  // Also try saving to /tmp (works in serverless Vercel)
  try {
    fs.writeFileSync(tmpPath, JSON.stringify(creds, null, 2), "utf-8");
  } catch (err) {
    // Ignore
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

