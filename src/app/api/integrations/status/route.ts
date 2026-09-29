import { NextResponse } from "next/server";
import { 
  getStoredCredentials, 
  maskSecret, 
  maskClientId, 
  getConnectedGoogleAccounts 
} from "@/lib/integrations/config";

export async function GET() {
  const creds = getStoredCredentials();
  const accounts = getConnectedGoogleAccounts(creds);

  const googleConnected = accounts.some((a) => a.status === "active" || a.refreshToken || a.accessToken) ||
    Boolean(creds.googleAccessToken || (creds.googleRefreshToken && creds.googleClientId));

  const notionConnected = Boolean(
    creds.notionApiKey && creds.notionDatabaseId
  );

  // Sanitize connected accounts for client-side rendering (never expose secrets or refresh tokens)
  const sanitizedAccounts = accounts.map((acc) => ({
    id: acc.id,
    provider: acc.provider,
    providerAccountId: acc.providerAccountId,
    email: acc.email,
    displayName: acc.displayName,
    avatarUrl: acc.avatarUrl,
    accountType: acc.accountType,
    status: acc.status,
    isDefault: Boolean(acc.isDefault),
    services: acc.services || ["calendar", "tasks"],
    connectedAt: acc.connectedAt,
    lastUsedAt: acc.lastUsedAt,
    lastErrorMessage: acc.lastErrorMessage,
    hasRefreshToken: Boolean(acc.refreshToken),
    hasAccessToken: Boolean(acc.accessToken),
  }));

  return NextResponse.json({
    google: {
      connected: googleConnected,
      accountCount: accounts.length,
      hasClientId: Boolean(creds.googleClientId),
      maskedClientId: maskClientId(creds.googleClientId),
      hasClientSecret: Boolean(creds.googleClientSecret),
      maskedClientSecret: maskSecret(creds.googleClientSecret),
      hasRefreshToken: Boolean(creds.googleRefreshToken),
      maskedRefreshToken: maskSecret(creds.googleRefreshToken),
      hasAccessToken: Boolean(creds.googleAccessToken),
      maskedAccessToken: maskSecret(creds.googleAccessToken),
    },
    notion: {
      connected: notionConnected,
      hasApiKey: Boolean(creds.notionApiKey),
      maskedApiKey: maskSecret(creds.notionApiKey),
      hasDatabaseId: Boolean(creds.notionDatabaseId),
      maskedDatabaseId: maskSecret(creds.notionDatabaseId),
    },
    connectedAccounts: sanitizedAccounts,
  });
}
