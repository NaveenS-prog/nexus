import { UnifiedItem } from "../types";
import { 
  getStoredCredentials, 
  saveStoredCredentials, 
  IntegrationCredentials,
  getGoogleAccountById,
  updateGoogleAccount,
  getConnectedGoogleAccounts,
  GoogleAccountCredentials
} from "./config";
import { addDays, addMinutes, differenceInMinutes, format, parseISO, subDays } from "date-fns";
import { isBirthdayItem } from "@/lib/nlp/itemClassifier";

export interface TokenResult {
  token: string | null;
  refreshed: boolean;
  newAccessToken?: string;
  newExpiry?: number;
  error?: string;
}

/**
 * Directly refreshes the Google OAuth access token using the refresh_token.
 * Supports account-specific token refresh with independent error isolation.
 */
export async function refreshGoogleAccessToken(
  creds?: IntegrationCredentials,
  accountId?: string
): Promise<{ accessToken: string; tokenExpiry: number } | null> {
  const currentCreds = creds || getStoredCredentials();
  
  // Resolve target account if accountId provided
  let targetAccount: GoogleAccountCredentials | undefined | null = undefined;
  if (accountId) {
    targetAccount = getGoogleAccountById(accountId);
  } else {
    // If no accountId, check if any connected account matches
    const accounts = getConnectedGoogleAccounts(currentCreds);
    targetAccount = accounts.find((a) => a.isDefault) || accounts[0];
  }

  const refreshToken = targetAccount?.refreshToken || currentCreds.googleRefreshToken;
  const clientId = targetAccount?.clientId || currentCreds.googleClientId || process.env.GOOGLE_CLIENT_ID;
  const clientSecret = targetAccount?.clientSecret || currentCreds.googleClientSecret || process.env.GOOGLE_CLIENT_SECRET;

  if (!refreshToken || !clientId || !clientSecret) {
    if (targetAccount?.id) {
      updateGoogleAccount(targetAccount.id, {
        status: "reauth_required",
        lastErrorMessage: "Missing refresh token or client credentials",
      });
    }
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
      console.error(`Failed to refresh Google access token for account ${targetAccount?.email || accountId || "default"}:`, errText);
      
      if (res.status === 400 || errText.includes("invalid_grant")) {
        // Isolate failure to this specific account
        if (targetAccount?.id) {
          updateGoogleAccount(targetAccount.id, {
            status: "reauth_required",
            lastErrorMessage: "Authorization expired or revoked. Please re-authenticate.",
          });
        }
      }
      return null;
    }

    const data = await res.json();
    const newAccessToken = data.access_token;
    const expiresIn = data.expires_in || 3600;
    const tokenExpiry = Date.now() + expiresIn * 1000;

    // Update target account credentials independently
    if (targetAccount?.id) {
      updateGoogleAccount(targetAccount.id, {
        accessToken: newAccessToken,
        tokenExpiry,
        status: "active",
        lastErrorMessage: undefined,
        lastUsedAt: new Date().toISOString(),
      });
    }

    // Also update legacy single-account slots for backward compatibility
    saveStoredCredentials({
      googleAccessToken: newAccessToken,
      googleTokenExpiry: tokenExpiry,
      googleClientId: clientId,
      googleClientSecret: clientSecret,
      googleRefreshToken: refreshToken,
    });

    return { accessToken: newAccessToken, tokenExpiry };
  } catch (err: any) {
    console.error("Error refreshing Google access token:", err);
    if (targetAccount?.id) {
      updateGoogleAccount(targetAccount.id, {
        status: "error",
        lastErrorMessage: err.message || "Network error refreshing token",
      });
    }
    return null;
  }
}

/**
 * Returns a valid, non-expired Google Access Token, automatically refreshing if needed.
 * Optionally targets a specific connected account.
 */
export async function getValidGoogleAccessToken(
  accountId?: string,
  overrideCreds?: Partial<IntegrationCredentials>
): Promise<TokenResult> {
  const creds = getStoredCredentials(overrideCreds);

  // If specific account requested
  if (accountId) {
    const account = getGoogleAccountById(accountId);
    if (!account) {
      return { token: null, refreshed: false, error: `Account ${accountId} not found` };
    }

    const isExpiringSoon = !account.tokenExpiry || account.tokenExpiry <= Date.now() + 180000;
    if (account.accessToken && !isExpiringSoon) {
      return { token: account.accessToken, refreshed: false };
    }

    if (account.refreshToken) {
      const refreshed = await refreshGoogleAccessToken(creds, accountId);
      if (refreshed) {
        return {
          token: refreshed.accessToken,
          refreshed: true,
          newAccessToken: refreshed.accessToken,
          newExpiry: refreshed.tokenExpiry,
        };
      }
    }

    if (account.accessToken) {
      return { token: account.accessToken, refreshed: false };
    }

    return { token: null, refreshed: false, error: "Token expired and refresh failed" };
  }

  // Fallback to default or legacy single-account credentials
  const accounts = getConnectedGoogleAccounts(creds);
  const defaultAccount = accounts.find((a) => a.isDefault) || accounts[0];

  const targetAccessToken = defaultAccount?.accessToken || creds.googleAccessToken;
  const targetExpiry = defaultAccount?.tokenExpiry || creds.googleTokenExpiry;
  const targetRefreshToken = defaultAccount?.refreshToken || creds.googleRefreshToken;

  const isExpiringSoon = !targetExpiry || targetExpiry <= Date.now() + 180000;

  if (targetAccessToken && !isExpiringSoon) {
    return { token: targetAccessToken, refreshed: false };
  }

  if (targetRefreshToken) {
    const refreshed = await refreshGoogleAccessToken(creds, defaultAccount?.id);
    if (refreshed) {
      return {
        token: refreshed.accessToken,
        refreshed: true,
        newAccessToken: refreshed.accessToken,
        newExpiry: refreshed.tokenExpiry,
      };
    }
  }

  if (targetAccessToken) {
    return { token: targetAccessToken, refreshed: false };
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
 * Routes requests to the credentials of a specific connected account.
 */
export async function fetchWithGoogleAuth(
  url: string,
  options: RequestInit = {},
  accountId?: string,
  overrideCreds?: Partial<IntegrationCredentials>
): Promise<{ res: Response; token: string }> {
  let tokenResult = await getValidGoogleAccessToken(accountId, overrideCreds);
  let token = tokenResult.token;

  if (!token) {
    throw new Error(
      `No Google authorization token found${accountId ? ` for account (${accountId})` : ""}. Please connect your Google account in Settings.`
    );
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
    console.warn(`Google API returned 401 for ${url}: attempting emergency token refresh...`);
    const refreshed = await refreshGoogleAccessToken(creds, accountId);
    if (refreshed?.accessToken) {
      token = refreshed.accessToken;
      res = await fetch(url, { ...options, headers: buildHeaders(token) });
    }
  }

  return { res, token };
}

/**
 * Fetches live Google Tasks for an account and tags items with account identity metadata.
 */
export async function fetchLiveGoogleTasks(
  accountId?: string,
  overrideCreds?: Partial<IntegrationCredentials>
): Promise<UnifiedItem[]> {
  const account = accountId ? getGoogleAccountById(accountId) : undefined;
  const accountType = account?.accountType || "personal";
  const accountEmail = account?.email;

  const { res } = await fetchWithGoogleAuth(
    "https://tasks.googleapis.com/tasks/v1/lists/@default/tasks?showCompleted=true&showHidden=true&maxResults=100",
    {},
    accountId,
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
      const datePart = item.due.includes("T") ? item.due.split("T")[0] : item.due;
      taskDueAt = `${datePart}T23:59:59`;
    }

    const typeBadge = accountType === "university" ? "University" : "Personal";
    const tags = ["Google Tasks", typeBadge];

    return {
      id: `gtask-${item.id}`,
      externalId: item.id,
      source: "google_tasks",
      title: item.title || "Untitled Task",
      description: item.notes || undefined,
      category: accountType === "university" ? "academic" : "personal",
      priority: taskDueAt && new Date(taskDueAt).getTime() < Date.now() + 86400000 * 2 ? "high" : "medium",
      status: isCompleted ? "completed" : "pending",
      dueAt: taskDueAt,
      estimatedMinutes: 30,
      tags,
      connectedAccountId: account?.id || accountId,
      accountType,
      accountEmail,
      createdAt: item.updated || new Date().toISOString(),
      updatedAt: item.updated || new Date().toISOString(),
    };
  });
}

export interface GoogleCalendarSyncResult {
  items: UnifiedItem[];
  newCreds?: Partial<IntegrationCredentials>;
}

/**
 * Fetches live Google Calendar events for an account and tags items with account identity metadata.
 */
export async function fetchLiveGoogleCalendarEvents(
  accountId?: string,
  overrideCreds?: Partial<IntegrationCredentials>
): Promise<GoogleCalendarSyncResult> {
  const account = accountId ? getGoogleAccountById(accountId) : undefined;
  const accountType = account?.accountType || "personal";
  const accountEmail = account?.email;

  const tokenResult = await getValidGoogleAccessToken(accountId, overrideCreds);
  let token = tokenResult.token;

  if (!token) {
    throw new Error(`No Google authorization token found${accountEmail ? ` for ${accountEmail}` : ""}. Please connect Google Calendar in Settings.`);
  }

  const creds = getStoredCredentials(overrideCreds);
  let newCreds: Partial<IntegrationCredentials> | undefined = tokenResult.refreshed
    ? { googleAccessToken: tokenResult.newAccessToken, googleTokenExpiry: tokenResult.newExpiry }
    : undefined;

  const now = new Date();
  const timeMin = addDays(now, -90).toISOString();
  const timeMax = addDays(now, 365).toISOString();

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

    if (res.status === 401) {
      console.warn(`Google Calendar API returned 401 for ${calId}: attempting emergency token refresh...`);
      const refreshResult = await refreshGoogleAccessToken(creds, accountId);
      if (refreshResult) {
        currentToken = refreshResult.accessToken;
        token = refreshResult.accessToken;
        newCreds = {
          googleAccessToken: refreshResult.accessToken,
          googleTokenExpiry: refreshResult.tokenExpiry,
        };
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
  } catch {
    // Continue with primary calendar
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

    const typeBadge = accountType === "university" ? "University" : "Personal";
    const tags = isExam
      ? ["Exam", "Calendar", typeBadge]
      : isBirthday
      ? ["Birthday", "Calendar", typeBadge]
      : isAllDay
      ? ["Calendar", "All Day", typeBadge]
      : ["Calendar", typeBadge];

    const category = isExam ? "academic" : (accountType === "university" ? "academic" : (isBirthday ? "personal" : "calendar"));

    return {
      id: `gcal-${event.id}`,
      externalId: event.id,
      source: "google_calendar",
      title: summary,
      description: desc,
      category,
      priority: isExam ? "critical" : (isBirthday ? "low" : "medium"),
      status: "pending",
      startAt: eventStartAt,
      dueAt: eventDueAt,
      estimatedMinutes: isAllDay ? (isExam ? 90 : 480) : estimatedMinutes,
      url: event.htmlLink,
      tags,
      connectedAccountId: account?.id || accountId,
      accountType,
      accountEmail,
      metadata: { isAllDay, location: event.location, hangoutLink: event.hangoutLink },
      createdAt: event.created || new Date().toISOString(),
      updatedAt: event.updated || new Date().toISOString(),
    };
  });

  return { items, newCreds };
}

/**
 * Fetches Google Classroom courses and coursework (assignments) for a connected account.
 */
export async function fetchLiveGoogleClassroomItems(
  accountId: string,
  overrideCreds?: Partial<IntegrationCredentials>
): Promise<UnifiedItem[]> {
  const account = getGoogleAccountById(accountId);
  const accountEmail = account?.email;

  // 1. Fetch active courses
  const { res: coursesRes } = await fetchWithGoogleAuth(
    "https://classroom.googleapis.com/v1/courses?courseStates=ACTIVE&pageSize=20",
    {},
    accountId,
    overrideCreds
  );

  if (!coursesRes.ok) {
    const errText = await coursesRes.text();
    // If user is not a student or Classroom API isn't enabled for this account, log and return empty
    console.warn(`Classroom API note for ${accountEmail || accountId} (${coursesRes.status}):`, errText);
    return [];
  }

  const coursesData = await coursesRes.json();
  const courses: Array<{ id: string; name: string; section?: string }> = coursesData.courses || [];

  if (courses.length === 0) {
    return [];
  }

  const classroomItems: UnifiedItem[] = [];

  // 2. Fetch published coursework for each course
  for (const course of courses) {
    try {
      const { res: workRes } = await fetchWithGoogleAuth(
        `https://classroom.googleapis.com/v1/courses/${encodeURIComponent(course.id)}/courseWork?courseWorkStates=PUBLISHED&pageSize=30`,
        {},
        accountId,
        overrideCreds
      );

      if (!workRes.ok) continue;

      const workData = await workRes.json();
      const courseWorkList: any[] = workData.courseWork || [];

      for (const work of courseWorkList) {
        let dueAt: string | undefined = undefined;

        if (work.dueDate) {
          const year = work.dueDate.year;
          const month = String(work.dueDate.month).padStart(2, "0");
          const day = String(work.dueDate.day).padStart(2, "0");

          let hours = "23";
          let minutes = "59";
          let seconds = "59";

          if (work.dueTime) {
            hours = String(work.dueTime.hours ?? 23).padStart(2, "0");
            minutes = String(work.dueTime.minutes ?? 59).padStart(2, "0");
            seconds = String(work.dueTime.seconds ?? 0).padStart(2, "0");
          }

          dueAt = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
        }

        const isDueSoon = dueAt && new Date(dueAt).getTime() < Date.now() + 86400000 * 2;
        const priority = isDueSoon ? "critical" : "high";

        classroomItems.push({
          id: `gclassroom-${work.id}`,
          externalId: work.id,
          source: "google_classroom",
          title: work.title || "Coursework Deliverable",
          description: work.description ? `[${course.name}] ${work.description}` : `Classroom assignment for ${course.name}`,
          category: "academic",
          priority,
          status: "pending",
          dueAt,
          estimatedMinutes: 60,
          url: work.alternateLink,
          tags: ["Google Classroom", course.name, "University", "Assignment"],
          connectedAccountId: accountId,
          accountType: "university",
          accountEmail,
          metadata: {
            courseId: course.id,
            courseName: course.name,
            maxPoints: work.maxPoints,
            workType: work.workType,
          },
          createdAt: work.creationTime || new Date().toISOString(),
          updatedAt: work.updateTime || new Date().toISOString(),
        });
      }
    } catch (courseErr) {
      console.warn(`Failed to fetch coursework for course ${course.name} (${course.id}):`, courseErr);
    }
  }

  return classroomItems;
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
  accountId?: string,
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
      accountId,
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
  accountId?: string,
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
      accountId,
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
  accountId?: string,
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
      accountId,
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
  accountId?: string,
  overrideCreds?: Partial<IntegrationCredentials>
): Promise<boolean> {
  try {
    const rawId = eventId.replace(/^gcal-/, "");
    const { res } = await fetchWithGoogleAuth(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(rawId)}`,
      { method: "DELETE" },
      accountId,
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
  accountId?: string,
  overrideCreds?: Partial<IntegrationCredentials>
): Promise<boolean> {
  try {
    const rawId = taskId.replace(/^gtask-/, "");
    const { res } = await fetchWithGoogleAuth(
      `https://tasks.googleapis.com/tasks/v1/lists/@default/tasks/${encodeURIComponent(rawId)}`,
      { method: "DELETE" },
      accountId,
      overrideCreds
    );
    return res.ok || res.status === 404 || res.status === 410;
  } catch (err) {
    console.error("Failed to delete Google Task:", err);
    return false;
  }
}
