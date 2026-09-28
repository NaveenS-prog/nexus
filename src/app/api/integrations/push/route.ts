import { NextResponse } from "next/server";
import { 
  createLiveGoogleCalendarEvent, 
  createLiveGoogleTask, 
  updateLiveGoogleTaskStatus, 
  deleteLiveGoogleCalendarEvent, 
  deleteLiveGoogleTask 
} from "@/lib/integrations/googleApi";
import { getStoredCredentials } from "@/lib/integrations/config";

export async function POST(req: Request) {
  try {
    const creds = getStoredCredentials();
    const isGoogleConnected = Boolean(
      creds.googleAccessToken || (creds.googleRefreshToken && (creds.googleClientId || process.env.GOOGLE_CLIENT_ID))
    );

    if (!isGoogleConnected) {
      return NextResponse.json({
        success: false,
        notConnected: true,
        message: "Google integration is not connected",
      });
    }

    const body = await req.json();
    const { action, type, item, isCompleted, id } = body;

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
        }, creds);

        if (result) {
          return NextResponse.json({
            success: true,
            googleId: `gcal-${result.id}`,
            externalId: result.id,
            url: result.htmlLink,
            message: "Event created in Google Calendar",
          });
        }
      } else {
        // Create in Google Tasks
        const result = await createLiveGoogleTask({
          title: item.title,
          description: item.description,
          dueAt: item.dueAt,
        }, creds);

        if (result) {
          return NextResponse.json({
            success: true,
            googleId: `gtask-${result.id}`,
            externalId: result.id,
            message: "Task created in Google Tasks",
          });
        }
      }

      return NextResponse.json({
        success: false,
        message: "Failed to push item to Google",
      }, { status: 500 });
    }

    // 2. TOGGLE TASK COMPLETION
    if (action === "toggle_status") {
      const targetId = id || item?.id;
      if (targetId) {
        const ok = await updateLiveGoogleTaskStatus(targetId, Boolean(isCompleted), creds);
        return NextResponse.json({ success: ok });
      }
    }

    // 3. DELETE ITEM
    if (action === "delete") {
      const targetId = id || item?.id;
      if (targetId) {
        if (targetId.startsWith("gcal-")) {
          const ok = await deleteLiveGoogleCalendarEvent(targetId, creds);
          return NextResponse.json({ success: ok });
        } else if (targetId.startsWith("gtask-")) {
          const ok = await deleteLiveGoogleTask(targetId, creds);
          return NextResponse.json({ success: ok });
        }
      }
    }

    return NextResponse.json({ success: false, message: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    console.error("Error in /api/integrations/push:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
