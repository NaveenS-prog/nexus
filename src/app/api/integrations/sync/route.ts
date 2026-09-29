import { NextResponse } from "next/server";
import { 
  fetchLiveGoogleTasks, 
  fetchLiveGoogleCalendarEvents,
  fetchLiveGoogleClassroomItems 
} from "@/lib/integrations/googleApi";
import { fetchLiveNotionItems } from "@/lib/integrations/notionApi";
import { 
  getStoredCredentials, 
  attachCredentialsCookie, 
  IntegrationCredentials,
  getConnectedGoogleAccounts,
  updateGoogleAccount
} from "@/lib/integrations/config";
import { UnifiedItem } from "@/lib/types";

export async function POST(req: Request) {
  let clientCreds: Partial<IntegrationCredentials> = {};
  let targetAccountId: string | undefined = undefined;

  try {
    const body = await req.json();
    if (body.credentials) {
      clientCreds = body.credentials;
    }
    if (body.accountId) {
      targetAccountId = body.accountId;
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
    googleClassroom: 0,
    notion: 0,
  };
  const accountStats: Record<string, { tasks: number; calendar: number; classroom: number; error?: string }> = {};

  const connectedAccounts = getConnectedGoogleAccounts(creds);

  if (connectedAccounts.length > 0) {
    // Filter to target account if specified
    const accountsToSync = targetAccountId
      ? connectedAccounts.filter((a) => a.id === targetAccountId)
      : connectedAccounts;

    for (const account of accountsToSync) {
      accountStats[account.id] = { tasks: 0, calendar: 0, classroom: 0 };
      const enabledServices = account.services || ["calendar", "tasks"];

      // 1. Google Tasks (if enabled for this account)
      if (enabledServices.includes("tasks")) {
        try {
          const gtasks = await fetchLiveGoogleTasks(account.id, creds);
          allItems.push(...gtasks);
          stats.googleTasks += gtasks.length;
          accountStats[account.id].tasks = gtasks.length;
        } catch (err: any) {
          console.error(`Failed to sync Google Tasks for ${account.email}:`, err);
          const msg = `Tasks (${account.email}): ${err.message}`;
          errors.push(msg);
          accountStats[account.id].error = msg;
          if (err.message.includes("401") || err.message.includes("invalid_grant")) {
            updateGoogleAccount(account.id, { status: "reauth_required" });
          }
        }
      }

      // 2. Google Calendar (if enabled for this account)
      if (enabledServices.includes("calendar")) {
        try {
          const gcalResult = await fetchLiveGoogleCalendarEvents(account.id, creds);
          allItems.push(...gcalResult.items);
          stats.googleCalendar += gcalResult.items.length;
          accountStats[account.id].calendar = gcalResult.items.length;
        } catch (err: any) {
          console.error(`Failed to sync Google Calendar for ${account.email}:`, err);
          const msg = `Calendar (${account.email}): ${err.message}`;
          errors.push(msg);
          accountStats[account.id].error = msg;
          if (err.message.includes("401") || err.message.includes("invalid_grant")) {
            updateGoogleAccount(account.id, { status: "reauth_required" });
          }
        }
      }

      // 3. Google Classroom (if enabled for this account, e.g. university)
      if (enabledServices.includes("classroom")) {
        try {
          const classroomItems = await fetchLiveGoogleClassroomItems(account.id, creds);
          allItems.push(...classroomItems);
          stats.googleClassroom += classroomItems.length;
          accountStats[account.id].classroom = classroomItems.length;
        } catch (err: any) {
          console.error(`Failed to sync Google Classroom for ${account.email}:`, err);
          const msg = `Classroom (${account.email}): ${err.message}`;
          errors.push(msg);
          accountStats[account.id].error = msg;
        }
      }
    }
  } else {
    // Fallback: Legacy single-account sync
    if (creds.googleAccessToken || (creds.googleRefreshToken && (creds.googleClientId || process.env.GOOGLE_CLIENT_ID))) {
      try {
        const gtasks = await fetchLiveGoogleTasks(undefined, creds);
        allItems.push(...gtasks);
        stats.googleTasks = gtasks.length;
      } catch (err: any) {
        console.error("Failed to sync legacy Google Tasks:", err);
        errors.push(`Google Tasks: ${err.message}`);
      }

      try {
        const gcalResult = await fetchLiveGoogleCalendarEvents(undefined, creds);
        allItems.push(...gcalResult.items);
        stats.googleCalendar = gcalResult.items.length;
      } catch (err: any) {
        console.error("Failed to sync legacy Google Calendar:", err);
        errors.push(`Google Calendar: ${err.message}`);
      }
    }
  }

  // 4. Sync Notion
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

  const res = NextResponse.json({
    success: errors.length === 0,
    syncedAt: new Date().toISOString(),
    totalItems: allItems.length,
    stats,
    accountStats,
    errors,
    items: allItems,
  });

  return attachCredentialsCookie(res, creds);
}
