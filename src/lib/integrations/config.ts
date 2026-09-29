import fs from "fs";
import path from "path";
import os from "os";

export type AccountType = "personal" | "university" | "work" | "other";
export type GoogleServiceType = "calendar" | "tasks" | "classroom" | "drive";

export interface GoogleAccountCredentials {
  id: string; // connected_account_id
  provider?: "google";
  providerAccountId?: string; // Google user sub/ID
  email: string;
  displayName?: string;
  avatarUrl?: string;
  accountType: AccountType;
  status: "active" | "reauth_required" | "error" | "disconnected";
  refreshToken: string;
  accessToken?: string;
  tokenExpiry?: number;
  clientId?: string;
  clientSecret?: string;
  isDefault?: boolean;
  services?: GoogleServiceType[];
  lastErrorMessage?: string;
  connectedAt: string;
  lastUsedAt: string;
  scopes?: string[];
  enabledServices?: {
    calendar?: boolean;
    tasks?: boolean;
    classroom?: boolean;
    drive?: boolean;
  };
  metadata?: Record<string, any>;
}

export interface IntegrationCredentials {
  // Global OAuth Client identifiers
  googleClientId?: string;
  googleClientSecret?: string;

  // Multi-Account Store: Keyed by connectedAccountId
  googleAccounts?: Record<string, GoogleAccountCredentials>;

  // Legacy single-account fallback fields
  googleRefreshToken?: string;
  googleAccessToken?: string;
  googleTokenExpiry?: number;
  googleAccountEmail?: string;

  // Notion credentials
  notionApiKey?: string;
  notionDatabaseId?: string;
}

function getLocalCredsPath(): string {
  return path.join(process.cwd(), "nexus_credentials.json");
}

function getTmpCredsPath(): string {
  return path.join(os.tmpdir(), "nexus_credentials.json");
}

export function encodeCredentials(creds: IntegrationCredentials): string {
  try {
    const json = JSON.stringify(creds);
    return Buffer.from(json, "utf-8").toString("base64url");
  } catch {
    return "";
  }
}

export function decodeCredentials(str?: string): Partial<IntegrationCredentials> {
  if (!str) return {};
  try {
    const json = Buffer.from(str, "base64url").toString("utf-8");
    return JSON.parse(json);
  } catch {
    return {};
  }
}

function getCookieCreds(): Partial<IntegrationCredentials> {
  try {
    const { cookies } = require("next/headers");
    const cookieStore = cookies();
    const raw = cookieStore.get("nexus_auth_session")?.value;
    if (raw) {
      return decodeCredentials(raw);
    }
  } catch {
    // cookies() unavailable outside request context or in scripts
  }
  return {};
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

  // 3. Read from HttpOnly cookie session (persists across serverless cold starts & restarts)
  const cookieCreds = getCookieCreds();

  // Merge googleAccounts dictionaries across sources
  const mergedAccounts: Record<string, GoogleAccountCredentials> = {
    ...(fileCreds.googleAccounts || {}),
    ...(cookieCreds.googleAccounts || {}),
    ...(overrideCreds?.googleAccounts || {}),
  };

  const cleanedOverride: Partial<IntegrationCredentials> = {};
  if (overrideCreds) {
    for (const [k, v] of Object.entries(overrideCreds)) {
      if (k === "googleAccounts") continue;
      if (typeof v === "string" && v.trim() !== "") {
        (cleanedOverride as any)[k] = v.trim();
      } else if (typeof v === "number" && !isNaN(v)) {
        (cleanedOverride as any)[k] = v;
      }
    }
  }

  const merged: IntegrationCredentials = {
    ...envCreds,
    ...fileCreds,
    ...cookieCreds,
    ...cleanedOverride,
    googleAccounts: mergedAccounts,
  };

  // 4. Backward Compatibility & Automatic Migration:
  // If no multi-accounts exist yet, but legacy single-account googleRefreshToken is present,
  // automatically create a default Personal Google Account record!
  const accountKeys = Object.keys(mergedAccounts);
  if (accountKeys.length === 0 && merged.googleRefreshToken) {
    const defaultId = "acct-google-primary";
    const migratedAccount: GoogleAccountCredentials = {
      id: defaultId,
      email: merged.googleAccountEmail || "primary@gmail.com",
      displayName: "Primary Google Account",
      accountType: "personal",
      status: "active",
      refreshToken: merged.googleRefreshToken,
      accessToken: merged.googleAccessToken,
      tokenExpiry: merged.googleTokenExpiry,
      isDefault: true,
      connectedAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
      enabledServices: {
        calendar: true,
        tasks: true,
        classroom: false,
        drive: false,
      },
    };
    merged.googleAccounts = { [defaultId]: migratedAccount };
  } else if (accountKeys.length > 0) {
    // Keep single-account fallback fields synced to the default account
    const defaultAcc = Object.values(merged.googleAccounts!).find((a) => a.isDefault) || Object.values(merged.googleAccounts!)[0];
    if (defaultAcc) {
      merged.googleRefreshToken = defaultAcc.refreshToken;
      merged.googleAccessToken = defaultAcc.accessToken;
      merged.googleTokenExpiry = defaultAcc.tokenExpiry;
      merged.googleAccountEmail = defaultAcc.email;
    }
  }

  return merged;
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
      delete (merged as any)[k];
    } else if (k === "googleAccounts" && typeof v === "object") {
      merged.googleAccounts = { ...(merged.googleAccounts || {}), ...(v as any) };
    } else if (v !== undefined) {
      (merged as any)[k] = v;
    }
  }

  persistToDisk(merged);
  return merged;
}

/**
 * Returns all connected Google accounts from credentials.
 */
export function getConnectedGoogleAccounts(overrideCreds?: Partial<IntegrationCredentials>): GoogleAccountCredentials[] {
  const creds = getStoredCredentials(overrideCreds);
  if (!creds.googleAccounts) return [];
  return Object.values(creds.googleAccounts);
}

/**
 * Retrieves a specific connected Google account by its accountId.
 */
export function getGoogleAccountById(accountId: string, overrideCreds?: Partial<IntegrationCredentials>): GoogleAccountCredentials | null {
  const creds = getStoredCredentials(overrideCreds);
  if (!creds.googleAccounts) return null;
  return creds.googleAccounts[accountId] || null;
}

/**
 * Retrieves a connected Google account by its email address.
 */
export function getGoogleAccountByEmail(email: string, overrideCreds?: Partial<IntegrationCredentials>): GoogleAccountCredentials | null {
  const creds = getStoredCredentials(overrideCreds);
  if (!creds.googleAccounts) return null;
  const normalized = email.trim().toLowerCase();
  return Object.values(creds.googleAccounts).find((a) => a.email.toLowerCase() === normalized) || null;
}

/**
 * Saves or updates a specific connected Google account.
 */
export function saveGoogleAccount(account: GoogleAccountCredentials): IntegrationCredentials {
  const existing = getStoredCredentials();
  const accounts = { ...(existing.googleAccounts || {}) };

  // If this account is marked as default, unset default on other accounts
  if (account.isDefault) {
    for (const key of Object.keys(accounts)) {
      if (key !== account.id) {
        accounts[key] = { ...accounts[key], isDefault: false };
      }
    }
  } else if (Object.keys(accounts).length === 0) {
    account.isDefault = true;
  }

  accounts[account.id] = account;

  const toSave: Partial<IntegrationCredentials> = {
    googleAccounts: accounts,
    googleRefreshToken: account.isDefault ? account.refreshToken : existing.googleRefreshToken,
    googleAccessToken: account.isDefault ? account.accessToken : existing.googleAccessToken,
    googleTokenExpiry: account.isDefault ? account.tokenExpiry : existing.googleTokenExpiry,
    googleAccountEmail: account.isDefault ? account.email : existing.googleAccountEmail,
  };

  return saveStoredCredentials(toSave);
}

/**
 * Removes a specific connected Google account by id.
 */
export function removeGoogleAccount(accountId: string): IntegrationCredentials {
  const existing = getStoredCredentials();
  const accounts = { ...(existing.googleAccounts || {}) };
  delete accounts[accountId];

  // If we deleted the default account, make another account the default if one exists
  const remaining = Object.values(accounts);
  if (remaining.length > 0 && !remaining.some((a) => a.isDefault)) {
    remaining[0].isDefault = true;
    accounts[remaining[0].id] = remaining[0];
  }

  const toSave: Partial<IntegrationCredentials> = {
    googleAccounts: accounts,
    googleRefreshToken: remaining.length > 0 ? remaining[0].refreshToken : "",
    googleAccessToken: remaining.length > 0 ? remaining[0].accessToken : "",
    googleTokenExpiry: remaining.length > 0 ? remaining[0].tokenExpiry : 0,
    googleAccountEmail: remaining.length > 0 ? remaining[0].email : "",
  };

  return saveStoredCredentials(toSave);
}

/**
 * Updates properties (such as accountType or enabledServices) for a connected Google account.
 */
export function updateGoogleAccount(accountId: string, updates: Partial<GoogleAccountCredentials>): IntegrationCredentials {
  const account = getGoogleAccountById(accountId);
  if (!account) return getStoredCredentials();
  const updatedAccount: GoogleAccountCredentials = {
    ...account,
    ...updates,
    lastUsedAt: new Date().toISOString(),
  };
  return saveGoogleAccount(updatedAccount);
}

export function clearGoogleCredentials(): IntegrationCredentials {
  const existing = getStoredCredentials();
  delete existing.googleAccessToken;
  delete existing.googleRefreshToken;
  delete existing.googleTokenExpiry;
  delete existing.googleClientId;
  delete existing.googleClientSecret;
  delete existing.googleAccounts;
  delete existing.googleAccountEmail;

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

export function attachCredentialsCookie<T extends { cookies: any }>(response: T, creds: IntegrationCredentials): T {
  try {
    response.cookies.set("nexus_auth_session", encodeCredentials(creds), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });
  } catch (err) {
    console.error("Failed to attach credentials cookie:", err);
  }
  return response;
}

export function clearCredentialsCookie<T extends { cookies: any }>(response: T): T {
  try {
    response.cookies.set("nexus_auth_session", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
  } catch (err) {
    console.error("Failed to clear credentials cookie:", err);
  }
  return response;
}
