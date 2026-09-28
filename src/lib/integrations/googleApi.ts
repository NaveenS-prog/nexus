import { UnifiedItem } from "../types";
import { getStoredCredentials, saveStoredCredentials, IntegrationCredentials } from "./config";
import { addDays, addMinutes, differenceInMinutes, format, parseISO, subDays } from "date-fns";
import { isBirthdayItem } from "@/lib/nlp/itemClassifier";

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

export interface LivePushResult {
  success: boolean;
  id?: string;
  htmlLink?: string;
  error?: string;
}

/**
 * Universal authenticated fetch for Google APIs with automatic 401 retry and emergency token refresh.
 */
export async function fetchWithGoogleAuth(
  url: string,
  options: RequestInit = {},
  overrideCreds?: Partial<IntegrationCredentials>
): Promise<{ res: Response; token: string }> {
  let tokenResult = await getValidGoogleAccessToken(overrideCreds);
  let token = tokenResult.token;

  if (!token) {
    throw new Error("No Google authorization token found. Please connect your Google account in Settings.");
  }

  const buildHeaders = (authToken: string) => {
    const h = new Headers(options.headers || {});
    h.set("Authorization", `Bearer ${authToken}`);
    return h;
  };

  let res = await fetch(url, { ...options, headers: buildHeaders(token) });

  // If 401 Unauthorized, automatically attempt token refresh and retry once
  if (res.status === 401) {
    const creds = getStoredCredentials(overrideCreds);
    if (creds.googleRefreshToken) {
      console.warn("Google API returned 401: attempting emergency token refresh...");
      const refreshed = await refreshGoogleAccessToken(creds);
      if (refreshed?.accessToken) {
        token = refreshed.accessToken;
        res = await fetch(url, { ...options, headers: buildHeaders(token) });
      }
    }
  }

  return { res, token };
}

export async function fetchLiveGoogleTasks(
  overrideCreds?: Partial<IntegrationCredentials>
): Promise<UnifiedItem[]> {
  const { res } = await fetchWithGoogleAuth(
    "https://tasks.googleapis.com/tasks/v1/lists/@default/tasks?showCompleted=true&showHidden=true&maxResults=100",
    {},
    overrideCreds
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google Tasks API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const rawItems = data.items || [];

  return rawItems.map((item: any): UnifiedItem => {
    const isCompleted = item.status === "completed";
    let taskDueAt: string | undefined = undefined;
    if (item.due) {
      // Google Tasks returns due timestamps anchored to 00:00:00Z.
      // Anchor it directly to 23:59:59 of that specific calendar date to prevent cross-timezone date shifts.
      const datePart = item.due.includes("T") ? item.due.split("T")[0] : item.due;
      taskDueAt = `${datePart}T23:59:59`;
    }

    return {
      id: `gtask-${item.id}`,
      externalId: item.id,
      source: "google_tasks",
      title: item.title || "Untitled Task",
      description: item.notes || undefined,
      category: "personal",
      priority: taskDueAt && new Date(taskDueAt).getTime() < Date.now() + 86400000 * 2 ? "high" : "medium",
      status: isCompleted ? "completed" : "pending",
      dueAt: taskDueAt,
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
    const isBirthday = isBirthdayItem({ title: summary, description: desc });

    let eventStartAt: string | undefined = undefined;
    let eventDueAt: string | undefined = undefined;

    if (isAllDay && event.start?.date) {
      eventStartAt = `${event.start.date}T00:00:00`;

      // CRITICAL FIX: Google Calendar all-day event end.date is strictly EXCLUSIVE (1 day after the event).
      // For example, a single-day event on Sep 29 has start.date="2026-09-29" and end.date="2026-09-30".
      // We must compute the inclusive end date by subtracting 1 day from end.date.
      let inclusiveEndDate = event.start.date;
      if (event.end?.date) {
        try {
          const endD = parseISO(event.end.date);
          const startD = parseISO(event.start.date);
          const prevDay = subDays(endD, 1);
          if (prevDay >= startD) {
            inclusiveEndDate = format(prevDay, "yyyy-MM-dd");
          }
        } catch {
          inclusiveEndDate = event.start.date;
        }
      }
      eventDueAt = `${inclusiveEndDate}T23:59:59`;
    } else {
      eventStartAt = startStr ? new Date(startStr).toISOString() : undefined;
      eventDueAt = endStr ? new Date(endStr).toISOString() : undefined;
    }

    return {
      id: `gcal-${event.id}`,
      externalId: event.id,
      source: "google_calendar",
      title: summary,
      description: desc,
      category: isExam ? "academic" : (isBirthday ? "personal" : "calendar"),
      priority: isExam ? "critical" : (isBirthday ? "low" : "medium"),
      status: "pending",
      startAt: eventStartAt,
      dueAt: eventDueAt,
      estimatedMinutes: isAllDay ? (isExam ? 90 : 480) : estimatedMinutes,
      url: event.htmlLink,
      tags: isExam
        ? ["Exam", "Calendar"]
        : isBirthday
        ? ["Birthday", "Calendar"]
        : isAllDay
        ? ["Calendar", "All Day"]
        : ["Calendar"],
      metadata: { isAllDay, location: event.location, hangoutLink: event.hangoutLink },
      createdAt: event.created || new Date().toISOString(),
      updatedAt: event.updated || new Date().toISOString(),
    };
  });

  return { items, newCreds };
}

/**
 * Creates a new event directly in the user's primary Google Calendar via API.
 */
export async function createLiveGoogleCalendarEvent(
  eventData: {
    title: string;
    description?: string;
    startAt?: string;
    dueAt?: string;
    location?: string;
    isAllDay?: boolean;
  },
  overrideCreds?: Partial<IntegrationCredentials>
): Promise<LivePushResult> {
  try {
    const isAllDay = Boolean(
      eventData.isAllDay ||
      (eventData.startAt && eventData.startAt.includes("T00:00:00") && (!eventData.dueAt || eventData.dueAt.includes("T23:59:59")))
    );

    let body: any;
    if (isAllDay && eventData.startAt) {
      const startDate = eventData.startAt.slice(0, 10);
      let endDate = startDate;
      if (eventData.dueAt) {
        endDate = eventData.dueAt.slice(0, 10);
      }
      try {
        const parsedEnd = parseISO(`${endDate}T00:00:00`);
        const nextDay = addDays(parsedEnd, 1);
        endDate = format(nextDay, "yyyy-MM-dd");
      } catch {
        endDate = startDate;
      }

      body = {
        summary: eventData.title,
        description: eventData.description,
        location: eventData.location,
        start: { date: startDate },
        end: { date: endDate },
      };
    } else {
      const startIso = eventData.startAt ? new Date(eventData.startAt).toISOString() : new Date().toISOString();
      const endIso = eventData.dueAt
        ? new Date(eventData.dueAt).toISOString()
        : addMinutes(new Date(startIso), 60).toISOString();

      body = {
        summary: eventData.title,
        description: eventData.description,
        location: eventData.location,
        start: { dateTime: startIso },
        end: { dateTime: endIso },
      };
    }

    const { res } = await fetchWithGoogleAuth(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
      overrideCreds
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error("Failed to create Google Calendar event:", res.status, errText);
      return { success: false, error: `Google Calendar API error (${res.status}): ${errText}` };
    }

    const created = await res.json();
    return { success: true, id: created.id, htmlLink: created.htmlLink };
  } catch (err: any) {
    console.error("Exception creating Google Calendar event:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Creates a new task directly in the user's Google Tasks default list via API.
 */
export async function createLiveGoogleTask(
  taskData: {
    title: string;
    description?: string;
    dueAt?: string;
  },
  overrideCreds?: Partial<IntegrationCredentials>
): Promise<LivePushResult> {
  try {
    const body: any = {
      title: taskData.title,
      notes: taskData.description,
    };

    if (taskData.dueAt) {
      try {
        const datePart = taskData.dueAt.slice(0, 10);
        body.due = `${datePart}T00:00:00.000Z`;
      } catch {}
    }

    const { res } = await fetchWithGoogleAuth(
      "https://tasks.googleapis.com/tasks/v1/lists/@default/tasks",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
      overrideCreds
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error("Failed to create Google Task:", res.status, errText);
      return { success: false, error: `Google Tasks API error (${res.status}): ${errText}` };
    }

    const created = await res.json();
    return { success: true, id: created.id };
  } catch (err: any) {
    console.error("Exception creating Google Task:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Updates task completion status directly in Google Tasks.
 */
export async function updateLiveGoogleTaskStatus(
  taskId: string,
  isCompleted: boolean,
  overrideCreds?: Partial<IntegrationCredentials>
): Promise<boolean> {
  try {
    const rawId = taskId.replace(/^gtask-/, "");
    const body = {
      status: isCompleted ? "completed" : "needsAction",
      completed: isCompleted ? new Date().toISOString() : null,
    };

    const { res } = await fetchWithGoogleAuth(
      `https://tasks.googleapis.com/tasks/v1/lists/@default/tasks/${encodeURIComponent(rawId)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
      overrideCreds
    );

    return res.ok;
  } catch (err) {
    console.error("Failed to update Google Task status:", err);
    return false;
  }
}

/**
 * Deletes an event directly from Google Calendar via API.
 */
export async function deleteLiveGoogleCalendarEvent(
  eventId: string,
  overrideCreds?: Partial<IntegrationCredentials>
): Promise<boolean> {
  try {
    const rawId = eventId.replace(/^gcal-/, "");
    const { res } = await fetchWithGoogleAuth(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(rawId)}`,
      { method: "DELETE" },
      overrideCreds
    );
    return res.ok || res.status === 404 || res.status === 410;
  } catch (err) {
    console.error("Failed to delete Google Calendar event:", err);
    return false;
  }
}

/**
 * Deletes a task directly from Google Tasks via API.
 */
export async function deleteLiveGoogleTask(
  taskId: string,
  overrideCreds?: Partial<IntegrationCredentials>
): Promise<boolean> {
  try {
    const rawId = taskId.replace(/^gtask-/, "");
    const { res } = await fetchWithGoogleAuth(
      `https://tasks.googleapis.com/tasks/v1/lists/@default/tasks/${encodeURIComponent(rawId)}`,
      { method: "DELETE" },
      overrideCreds
    );
    return res.ok || res.status === 404 || res.status === 410;
  } catch (err) {
    console.error("Failed to delete Google Task:", err);
    return false;
  }
}


