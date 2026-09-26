import { UnifiedItem } from "../types";
import { getStoredCredentials, saveStoredCredentials, IntegrationCredentials } from "./config";
import { addDays, differenceInMinutes, parseISO } from "date-fns";

export interface TokenResult {
  token: string | null;
  refreshed: boolean;
  newAccessToken?: string;
  newExpiry?: number;
}

/**
 * Directly refreshes the Google OAuth access token using the refresh_token.
 */
export async function refreshGoogleAccessToken(
  creds: IntegrationCredentials
): Promise<{ accessToken: string; tokenExpiry: number } | null> {
  const refreshToken = creds.googleRefreshToken;
  const clientId = creds.googleClientId || process.env.GOOGLE_CLIENT_ID;
  const clientSecret = creds.googleClientSecret || process.env.GOOGLE_CLIENT_SECRET;

  if (!refreshToken || !clientId || !clientSecret) {
    return null;
  }

  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Failed to refresh Google access token:", errText);
      return null;
    }

    const data = await res.json();
    const newAccessToken = data.access_token;
    const expiresIn = data.expires_in || 3600;
    const tokenExpiry = Date.now() + expiresIn * 1000;

    saveStoredCredentials({
      googleAccessToken: newAccessToken,
      googleTokenExpiry: tokenExpiry,
      googleClientId: clientId,
      googleClientSecret: clientSecret,
      googleRefreshToken: refreshToken,
    });

    return { accessToken: newAccessToken, tokenExpiry };
  } catch (err) {
    console.error("Error refreshing Google access token:", err);
    return null;
  }
}

/**
 * Returns a valid, non-expired Google Access Token, automatically refreshing if needed.
 */
export async function getValidGoogleAccessToken(
  overrideCreds?: Partial<IntegrationCredentials>
): Promise<TokenResult> {
  const creds = getStoredCredentials(overrideCreds);

  // Check if existing token is valid for at least 3 more minutes
  const isExpiringSoon = !creds.googleTokenExpiry || creds.googleTokenExpiry <= Date.now() + 180000;

  if (creds.googleAccessToken && !isExpiringSoon) {
    return { token: creds.googleAccessToken, refreshed: false };
  }

  // Token is expired, expiring soon, or missing: attempt refresh using refresh_token
  if (creds.googleRefreshToken) {
    const refreshed = await refreshGoogleAccessToken(creds);
    if (refreshed) {
      return {
        token: refreshed.accessToken,
        refreshed: true,
        newAccessToken: refreshed.accessToken,
        newExpiry: refreshed.tokenExpiry,
      };
    }
  }

  // Fallback to existing token if refresh is not possible (better to try than fail immediately)
  if (creds.googleAccessToken) {
    return { token: creds.googleAccessToken, refreshed: false };
  }

  return { token: null, refreshed: false };
}

export async function fetchLiveGoogleTasks(
  overrideCreds?: Partial<IntegrationCredentials>
): Promise<UnifiedItem[]> {
  const tokenResult = await getValidGoogleAccessToken(overrideCreds);
  const token = tokenResult.token;

  if (!token) {
    throw new Error("No valid Google Access Token or Refresh Token found.");
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

export interface GoogleCalendarSyncResult {
  items: UnifiedItem[];
  newCreds?: Partial<IntegrationCredentials>;
}

export async function fetchLiveGoogleCalendarEvents(
  overrideCreds?: Partial<IntegrationCredentials>
): Promise<GoogleCalendarSyncResult> {
  const tokenResult = await getValidGoogleAccessToken(overrideCreds);
  let token = tokenResult.token;

  if (!token) {
    throw new Error("No Google authorization token found. Please connect your Google Calendar in Settings.");
  }

  const creds = getStoredCredentials(overrideCreds);
  let newCreds: Partial<IntegrationCredentials> | undefined = tokenResult.refreshed
    ? { googleAccessToken: tokenResult.newAccessToken, googleTokenExpiry: tokenResult.newExpiry }
    : undefined;

  // Broad search window: from 90 days ago to 365 days into the future
  const now = new Date();
  const timeMin = addDays(now, -90).toISOString();
  const timeMax = addDays(now, 365).toISOString();

  // Helper to fetch events from a calendar ID with auto-retry on 401
  const fetchCalendarEvents = async (calId: string, currentToken: string) => {
    const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events`);
    url.searchParams.append("timeMin", timeMin);
    url.searchParams.append("timeMax", timeMax);
    url.searchParams.append("singleEvents", "true");
    url.searchParams.append("orderBy", "startTime");
    url.searchParams.append("maxResults", "2500");
    url.searchParams.append("showDeleted", "false");

    let res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${currentToken}` },
    });

    // If 401 Unauthorized, perform immediate emergency refresh
    if (res.status === 401 && creds.googleRefreshToken) {
      console.warn(`Google Calendar API returned 401 for ${calId}: attempting emergency token refresh...`);
      const refreshResult = await refreshGoogleAccessToken(creds);
      if (refreshResult) {
        currentToken = refreshResult.accessToken;
        token = refreshResult.accessToken;
        newCreds = {
          googleAccessToken: refreshResult.accessToken,
          googleTokenExpiry: refreshResult.tokenExpiry,
        };
        // Retry with fresh token
        res = await fetch(url.toString(), {
          headers: { Authorization: `Bearer ${currentToken}` },
        });
      }
    }

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Google Calendar API error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    return data.items || [];
  };

  // Discover all calendars associated with the user account
  let targetCalendars = ["primary"];
  try {
    const calListRes = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=50", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (calListRes.ok) {
      const calListData = await calListRes.json();
      if (calListData.items && Array.isArray(calListData.items)) {
        const additional = calListData.items
          .filter((c: any) => c.selected || c.primary || c.accessRole === "owner")
          .map((c: any) => c.id)
          .filter((id: string) => id && id !== "primary");
        targetCalendars = ["primary", ...additional];
      }
    }
  } catch (err) {
    // If listing calendar list fails, continue with primary calendar
  }

  const rawEventsList: any[] = [];
  const seenEventIds = new Set<string>();

  for (const calId of targetCalendars) {
    try {
      const events = await fetchCalendarEvents(calId, token);
      for (const ev of events) {
        if (ev.status !== "cancelled" && !seenEventIds.has(ev.id)) {
          seenEventIds.add(ev.id);
          rawEventsList.push(ev);
        }
      }
    } catch (err: any) {
      // If primary calendar fails, throw error; if secondary calendar fails, continue
      if (calId === "primary") {
        throw err;
      } else {
        console.warn(`Failed to fetch from secondary calendar ${calId}:`, err);
      }
    }
  }

  const items = rawEventsList.map((event: any): UnifiedItem => {
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

    const isAllDay = Boolean(event.start?.date && !event.start?.dateTime);
    const summary = event.summary || "Calendar Event";
    const desc = event.description || (event.location ? `Location: ${event.location}` : undefined);
    const isExam = /\b(?:ia|i\.a\.|cia|cat|internals?|exam|test|quiz|midterm|viva)\b/i.test(`${summary} ${desc || ""}`);

    return {
      id: `gcal-${event.id}`,
      externalId: event.id,
      source: "google_calendar",
      title: summary,
      description: desc,
      category: isExam ? "academic" : "calendar",
      priority: isExam ? "critical" : "medium",
      status: "pending",
      startAt: startStr ? (isAllDay ? `${event.start.date}T00:00:00` : new Date(startStr).toISOString()) : undefined,
      dueAt: endStr ? (isAllDay ? `${event.end.date}T23:59:59` : new Date(endStr).toISOString()) : undefined,
      estimatedMinutes: isAllDay ? (isExam ? 90 : 480) : estimatedMinutes,
      url: event.htmlLink,
      tags: isExam ? ["Exam", "Calendar"] : (isAllDay ? ["Calendar", "All Day"] : ["Calendar"]),
      metadata: { isAllDay, location: event.location, hangoutLink: event.hangoutLink },
      createdAt: event.created || new Date().toISOString(),
      updatedAt: event.updated || new Date().toISOString(),
    };
  });

  return { items, newCreds };
}
