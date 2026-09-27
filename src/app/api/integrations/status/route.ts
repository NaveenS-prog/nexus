import { NextResponse } from "next/server";
import { getStoredCredentials, maskSecret, maskClientId } from "@/lib/integrations/config";

export async function GET() {
  const creds = getStoredCredentials();

  const googleConnected = Boolean(
    creds.googleAccessToken || (creds.googleRefreshToken && creds.googleClientId)
  );

  const notionConnected = Boolean(
    creds.notionApiKey && creds.notionDatabaseId
  );

  return NextResponse.json({
    google: {
      connected: googleConnected,
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
  });
}
