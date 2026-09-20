import { NextResponse } from "next/server";
import { getStoredCredentials } from "@/lib/integrations/config";

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
      hasRefreshToken: Boolean(creds.googleRefreshToken),
      hasAccessToken: Boolean(creds.googleAccessToken),
    },
    notion: {
      connected: notionConnected,
      hasApiKey: Boolean(creds.notionApiKey),
      hasDatabaseId: Boolean(creds.notionDatabaseId),
    },
  });
}
