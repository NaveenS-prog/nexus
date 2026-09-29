import { NextResponse } from "next/server";
import { 
  createLiveGoogleCalendarEvent, 
  createLiveGoogleTask, 
  updateLiveGoogleTaskStatus, 
  deleteLiveGoogleCalendarEvent, 
  deleteLiveGoogleTask,
  getValidGoogleAccessToken,
} from "@/lib/integrations/googleApi";
import { 
  getStoredCredentials, 
  attachCredentialsCookie, 
  IntegrationCredentials,
  getConnectedGoogleAccounts 
} from "@/lib/integrations/config";

export async function POST(req: Request) {
  try {
    let clientCreds: Partial<IntegrationCredentials> = {};
    let body: any = {};
    try {
      body = await req.json();
      if (body.credentials) {
        clientCreds = body.credentials;
      }
    } catch {
      // Body parse fallback
    }

    const creds = getStoredCredentials(clientCreds);
    const connectedAccounts = getConnectedGoogleAccounts(creds);
    const isGoogleConnected = connectedAccounts.length > 0 || Boolean(
      creds.googleAccessToken || (creds.googleRefreshToken && (creds.googleClientId || process.env.GOOGLE_CLIENT_ID))
    );

    const { action, type, item, isCompleted, id, accountId: reqAccountId } = body;
    // Resolve target account ID from request or item metadata
    const targetAccountId = reqAccountId || item?.connectedAccountId;

    // 0. TEST CONNECTION ACTION
    if (action === "test") {
      if (!isGoogleConnected) {
        return NextResponse.json({
          success: false,
          connected: false,
          message: "Google account is not connected. Please connect your Google account in Settings.",
        });
      }

      try {
        const tokenResult = await getValidGoogleAccessToken(targetAccountId, creds);
        if (tokenResult.token) {
          const res = NextResponse.json({
            success: true,
            connected: true,
            message: `Google connection active and verified${targetAccountId ? ` for account (${targetAccountId})` : ""}!`,
          });
          return attachCredentialsCookie(res, creds);
        } else {
          return NextResponse.json({
            success: false,
            connected: false,
            message: tokenResult.error || "Failed to obtain valid Google access token.",
          });
        }
      } catch (err: any) {
        return NextResponse.json({
          success: false,
          connected: false,
          message: `Google authentication failed: ${err.message}`,
        });
      }
    }

    if (!isGoogleConnected) {
      return NextResponse.json({
        success: false,
        notConnected: true,
        message: "Google integration is not connected. Item saved locally in NEXUS.",
      });
    }

    // 1. CREATE EVENT / TASK
    if (action === "create") {
      if (type === "event" || item?.category === "calendar" || item?.source === "google_calendar") {
        const result = await createLiveGoogleCalendarEvent({
          title: item.title,
          description: item.description,
          startAt: item.startAt,
          dueAt: item.dueAt,
          location: item.metadata?.location,
          isAllDay: item.metadata?.isAllDay,
        }, targetAccountId, creds);

        if (result.success && result.id) {
          const res = NextResponse.json({
            success: true,
            googleId: `gcal-${result.id}`,
            externalId: result.id,
            url: result.htmlLink,
            message: "Event created and synced to Google Calendar",
          });
          return attachCredentialsCookie(res, creds);
        } else {
          return NextResponse.json({
            success: false,
            message: result.error || "Failed to create Google Calendar event",
          }, { status: 400 });
        }
      } else {
        // Create in Google Tasks
        const result = await createLiveGoogleTask({
          title: item.title,
          description: item.description,
          dueAt: item.dueAt,
        }, targetAccountId, creds);

        if (result.success && result.id) {
          const res = NextResponse.json({
            success: true,
            googleId: `gtask-${result.id}`,
            externalId: result.id,
            message: "Task created and synced to Google Tasks",
          });
          return attachCredentialsCookie(res, creds);
        } else {
          return NextResponse.json({
            success: false,
            message: result.error || "Failed to create Google Task",
          }, { status: 400 });
        }
      }
    }

    // 2. TOGGLE TASK COMPLETION
    if (action === "toggle_status") {
      const targetId = id || item?.id;
      if (targetId) {
        const ok = await updateLiveGoogleTaskStatus(targetId, Boolean(isCompleted), targetAccountId, creds);
        const res = NextResponse.json({ success: ok });
        return attachCredentialsCookie(res, creds);
      }
    }

    // 3. DELETE ITEM
    if (action === "delete") {
      const targetId = id || item?.id;
      if (targetId) {
        if (targetId.startsWith("gcal-")) {
          const ok = await deleteLiveGoogleCalendarEvent(targetId, targetAccountId, creds);
          const res = NextResponse.json({ success: ok });
          return attachCredentialsCookie(res, creds);
        } else if (targetId.startsWith("gtask-")) {
          const ok = await deleteLiveGoogleTask(targetId, targetAccountId, creds);
          const res = NextResponse.json({ success: ok });
          return attachCredentialsCookie(res, creds);
        }
      }
    }

    return NextResponse.json({ success: false, message: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    console.error("Error in /api/integrations/push:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
