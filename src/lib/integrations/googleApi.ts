import { UnifiedItem } from "../types";
import { getStoredCredentials, saveStoredCredentials } from "./config";
import { addDays, differenceInMinutes, parseISO } from "date-fns";

export async function getValidGoogleAccessToken(): Promise<string | null> {
  const creds = getStoredCredentials();

  // If accessToken is present and not expired (or within 5 min margin), use it
  if (creds.googleAccessToken && creds.googleTokenExpiry && creds.googleTokenExpiry > Date.now() + 300000) {
    return creds.googleAccessToken;
  }

  // Otherwise, refresh using refresh_token if available
  if (creds.googleRefreshToken && creds.googleClientId && creds.googleClientSecret) {
    try {
      const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: creds.googleClientId,
          client_secret: creds.googleClientSecret,
          refresh_token: creds.googleRefreshToken,
          grant_type: "refresh_token",
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error("Failed to refresh Google access token:", errText);
        return creds.googleAccessToken || null;
      }

      const data = await res.json();
      const newAccessToken = data.access_token;
      const expiresIn = data.expires_in || 3600;
      saveStoredCredentials({
        googleAccessToken: newAccessToken,
        googleTokenExpiry: Date.now() + expiresIn * 1000,
      });

      return newAccessToken;
    } catch (err) {
      console.error("Error refreshing Google access token:", err);
      return creds.googleAccessToken || null;
    }
  }

  return creds.googleAccessToken || null;
}

export async function fetchLiveGoogleTasks(): Promise<UnifiedItem[]> {
  const token = await getValidGoogleAccessToken();
  if (!token) {
    throw new Error("No valid Google Access Token or Refresh Token configured.");
  }

  const res = await fetch(
    "https://tasks.googleapis.com/tasks/v1/lists/@default/tasks?showCompleted=true&showHidden=true&maxResults=100",
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google Tasks API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const rawItems = data.items || [];

  return rawItems.map((item: any): UnifiedItem => {
    const isCompleted = item.status === "completed";
    return {
      id: `gtask-${item.id}`,
      externalId: item.id,
      source: "google_tasks",
      title: item.title || "Untitled Task",
      description: item.notes || undefined,
      category: "personal",
      priority: item.due && new Date(item.due).getTime() < Date.now() + 86400000 * 2 ? "high" : "medium",
      status: isCompleted ? "completed" : "pending",
      dueAt: item.due ? new Date(item.due).toISOString() : undefined,
      estimatedMinutes: 30,
      tags: ["Google Tasks"],
      createdAt: item.updated || new Date().toISOString(),
      updatedAt: item.updated || new Date().toISOString(),
    };
  });
}

export async function fetchLiveGoogleCalendarEvents(): Promise<UnifiedItem[]> {
  const token = await getValidGoogleAccessToken();
  if (!token) {
    throw new Error("No valid Google Access Token configured.");
  }

  const now = new Date();
  const timeMin = new Date(now.getTime() - 86400000).toISOString(); // Include yesterday
  const timeMax = addDays(now, 15).toISOString(); // 14-day window

  const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
  url.searchParams.append("timeMin", timeMin);
  url.searchParams.append("timeMax", timeMax);
  url.searchParams.append("singleEvents", "true");
  url.searchParams.append("orderBy", "startTime");
  url.searchParams.append("maxResults", "100");

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google Calendar API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const rawEvents = data.items || [];

  return rawEvents.map((event: any): UnifiedItem => {
    const startStr = event.start?.dateTime || event.start?.date;
    const endStr = event.end?.dateTime || event.end?.date;
    
    let estimatedMinutes = 60;
    if (startStr && endStr) {
      try {
        const start = parseISO(startStr);
        const end = parseISO(endStr);
        estimatedMinutes = Math.max(15, differenceInMinutes(end, start));
      } catch {
        estimatedMinutes = 60;
      }
    }

    return {
      id: `gcal-${event.id}`,
      externalId: event.id,
      source: "google_calendar",
      title: event.summary || "Calendar Event",
      description: event.description || (event.location ? `Location: ${event.location}` : undefined),
      category: "calendar",
      priority: "medium",
      status: "pending",
      startAt: startStr ? new Date(startStr).toISOString() : undefined,
      dueAt: endStr ? new Date(endStr).toISOString() : undefined,
      estimatedMinutes,
      url: event.htmlLink,
      tags: ["Calendar"],
      createdAt: event.created || new Date().toISOString(),
      updatedAt: event.updated || new Date().toISOString(),
    };
  });
}

export async function createLiveGoogleTask(title: string, due?: string, notes?: string) {
  const token = await getValidGoogleAccessToken();
  if (!token) throw new Error("No valid Google Access Token");

  const res = await fetch("https://tasks.googleapis.com/tasks/v1/lists/@default/tasks", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title,
      due,
      notes,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to create Google task: ${err}`);
  }

  return await res.json();
}

export async function updateLiveGoogleTaskStatus(taskId: string, completed: boolean) {
  const token = await getValidGoogleAccessToken();
  if (!token) throw new Error("No valid Google Access Token");

  const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/@default/tasks/${taskId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      status: completed ? "completed" : "needsAction",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to update Google task: ${err}`);
  }

  return await res.json();
}
