import { NextResponse } from "next/server";
import { fetchLiveGoogleTasks, fetchLiveGoogleCalendarEvents } from "@/lib/integrations/googleApi";
import { fetchLiveNotionItems } from "@/lib/integrations/notionApi";
import { getStoredCredentials, IntegrationCredentials } from "@/lib/integrations/config";
import { UnifiedItem } from "@/lib/types";

export async function POST(req: Request) {
  let clientCreds: Partial<IntegrationCredentials> = {};
  try {
    const body = await req.json();
    if (body.credentials) {
      clientCreds = body.credentials;
    }
  } catch {
    // Body is optional
  }

  const creds = getStoredCredentials(clientCreds);
  const allItems: UnifiedItem[] = [];
  const errors: string[] = [];
  const stats = {
    googleTasks: 0,
    googleCalendar: 0,
    notion: 0,
  };

  // 1. Sync Google Tasks
  if (creds.googleAccessToken || (creds.googleRefreshToken && creds.googleClientId)) {
    try {
      const gtasks = await fetchLiveGoogleTasks(creds);
      allItems.push(...gtasks);
      stats.googleTasks = gtasks.length;
    } catch (err: any) {
      console.error("Failed to sync Google Tasks:", err);
      errors.push(`Google Tasks: ${err.message}`);
    }
  }

  // 2. Sync Google Calendar
  if (creds.googleAccessToken || (creds.googleRefreshToken && creds.googleClientId)) {
    try {
      const gcal = await fetchLiveGoogleCalendarEvents(creds);
      allItems.push(...gcal);
      stats.googleCalendar = gcal.length;
    } catch (err: any) {
      console.error("Failed to sync Google Calendar:", err);
      errors.push(`Google Calendar: ${err.message}`);
    }
  }

  // 3. Sync Notion
  if (creds.notionApiKey && creds.notionDatabaseId) {
    try {
      const notionItems = await fetchLiveNotionItems(creds);
      allItems.push(...notionItems);
      stats.notion = notionItems.length;
    } catch (err: any) {
      console.error("Failed to sync Notion:", err);
      errors.push(`Notion: ${err.message}`);
    }
  }

  return NextResponse.json({
    success: errors.length === 0,
    syncedAt: new Date().toISOString(),
    totalItems: allItems.length,
    stats,
    errors,
    items: allItems,
  });
}
