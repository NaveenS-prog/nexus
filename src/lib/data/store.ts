"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  UnifiedItem, 
  Project, 
  DashboardMode, 
  NotificationItem, 
  IntegrationStatus, 
  FocusSession,
  ItemStatus
} from "../types";
import { 
  MOCK_UNIFIED_ITEMS, 
  MOCK_PROJECTS, 
  MOCK_INTEGRATIONS, 
  MOCK_NOTIFICATIONS, 
  MOCK_GITHUB_STATS,
  MOCK_FOCUS_SESSIONS
} from "./mockData";
import { smartTriageItem } from "../nlp/itemClassifier";
import { scanAndAutoAssignExamTasks, normalizeExamOrTaskTitle } from "../calendar/examScanner";

const STORAGE_KEY_ITEMS = "nexus_items_v1";
const STORAGE_KEY_PROJECTS = "nexus_projects_v1";
const STORAGE_KEY_MODE = "nexus_mode_v1";
const STORAGE_KEY_FOCUS = "nexus_focus_sessions_v1";
const STORAGE_KEY_NOTIFS = "nexus_notifications_v1";
const STORAGE_KEY_IS_LIVE = "nexus_is_live_v1";

export const DEFAULT_EXAMS: UnifiedItem[] = [
  {
    id: "evt-os-ia-exam-sep29",
    externalId: "os-ia-exam-sep29",
    source: "google_calendar",
    title: "OS IA exam",
    category: "academic",
    priority: "critical",
    status: "pending",
    smartDomain: "exam",
    startAt: "2026-09-29T09:00:00",
    dueAt: "2026-09-29T11:00:00",
    estimatedMinutes: 120,
    tags: ["Exam", "Calendar", "Academic"],
    metadata: { location: "Hall 114 B" },
    createdAt: "2026-09-24T00:00:00.000Z",
    updatedAt: "2026-09-24T00:00:00.000Z",
  },
  {
    id: "evt-coa-ia-exam-oct6",
    externalId: "coa-ia-exam-oct6",
    source: "google_calendar",
    title: "COA IA exam",
    category: "academic",
    priority: "critical",
    status: "pending",
    smartDomain: "exam",
    startAt: "2026-10-06T09:00:00",
    dueAt: "2026-10-06T11:00:00",
    estimatedMinutes: 120,
    tags: ["Exam", "Calendar", "Academic"],
    metadata: { location: "Hall 125B" },
    createdAt: "2026-09-24T00:00:00.000Z",
    updatedAt: "2026-09-24T00:00:00.000Z",
  },
  {
    id: "evt-python-ia-exam-oct9",
    externalId: "python-ia-exam-oct9",
    source: "google_calendar",
    title: "Python IA exam",
    category: "academic",
    priority: "critical",
    status: "pending",
    smartDomain: "exam",
    startAt: "2026-10-09T00:00:00",
    dueAt: "2026-10-09T23:59:59",
    estimatedMinutes: 90,
    tags: ["Exam", "Calendar", "All Day", "Academic"],
    metadata: { isAllDay: true },
    createdAt: "2026-09-24T00:00:00.000Z",
    updatedAt: "2026-09-24T00:00:00.000Z",
  },
];

export const DEFAULT_PYTHON_EXAM = DEFAULT_EXAMS[2];

const initialScannedItems = scanAndAutoAssignExamTasks(DEFAULT_EXAMS).items;

let memoryState: {
  items: UnifiedItem[];
  projects: Project[];
  mode: DashboardMode;
  notifications: NotificationItem[];
  focusSessions: FocusSession[];
  integrations: IntegrationStatus[];
  isSyncing: boolean;
  lastSyncedText: string;
  isLiveSynced: boolean;
  syncError?: string;
  needsReauth?: boolean;
} = {
  items: initialScannedItems,
  projects: [],
  mode: "default",
  notifications: [],
  focusSessions: [],
  integrations: MOCK_INTEGRATIONS,
  isSyncing: false,
  lastSyncedText: "Never",
  isLiveSynced: true,
  syncError: undefined,
  needsReauth: false,
};

const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

export function useNexusStore() {
  const [, setTick] = useState(0);

  useEffect(() => {
    // Hydrate from localStorage if available, thoroughly stripping any mock items
    if (typeof window !== "undefined") {
      try {
        const savedItems = localStorage.getItem(STORAGE_KEY_ITEMS);
        if (savedItems) {
          const parsed = JSON.parse(savedItems);
          if (Array.isArray(parsed)) {
            // Strip out ANY item that is a mock/demo item OR the hallucinated Oct 3 OS exam
            let realOnly = parsed.filter(
              (i: any) =>
                i.id !== "evt-os-ia-exam-oct3" &&
                !(normalizeExamOrTaskTitle(i.title) === "osiaexam" && (i.startAt?.startsWith("2026-10-03") || i.dueAt?.startsWith("2026-10-03"))) &&
                !/^item-[0-9]{1,3}$/.test(i.id || "") &&
                !i.id?.startsWith("mock-") &&
                !i.externalId?.startsWith("gcal-os-class") &&
                !i.externalId?.startsWith("gc-") &&
                !i.externalId?.startsWith("gcal-lunch")
            );

            // 1. Cleanse any stale lowercase "Python ia exam" cached in localStorage
            realOnly = realOnly.map((i: any) => {
              if (i.title === "Python ia exam") {
                return { ...i, title: "Python IA exam" };
              }
              return i;
            });

            // 2. Prioritize live Google Calendar API items:
            // If live Google Calendar events (gcal-*) are present, PURGE any seeded fallback evt-* items that duplicate them
            const liveGcalEvents = realOnly.filter((i: any) => i.id?.startsWith("gcal-"));
            if (liveGcalEvents.length > 0) {
              const liveNormSignatures = new Set(
                liveGcalEvents.map((i: any) => normalizeExamOrTaskTitle(i.title))
              );
              realOnly = realOnly.filter((i: any) => {
                if (i.id?.startsWith("evt-")) {
                  const norm = normalizeExamOrTaskTitle(i.title);
                  if (liveNormSignatures.has(norm)) return false; // Google API event is source of truth!
                }
                return true;
              });
            } else {
              // Only inject default fallback exams if NO live Google Calendar events are present yet
              DEFAULT_EXAMS.forEach((defExam) => {
                const defNorm = normalizeExamOrTaskTitle(defExam.title);
                const defDate = defExam.startAt?.slice(0, 10);
                if (
                  !realOnly.some(
                    (i: any) =>
                      i.id === defExam.id ||
                      (normalizeExamOrTaskTitle(i.title) === defNorm && (!defDate || i.startAt?.slice(0, 10) === defDate))
                  )
                ) {
                  realOnly.push(defExam);
                }
              });
            }

            // Automatically scan all events, deduplicate items and purge duplicate nexus tasks
            const { items: scannedItems } = scanAndAutoAssignExamTasks(realOnly);

            memoryState.items = scannedItems;
            localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(scannedItems));
          }
        } else {
          const { items: scannedDefaults } = scanAndAutoAssignExamTasks(DEFAULT_EXAMS);
          memoryState.items = scannedDefaults;
          localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(scannedDefaults));
        }

        const savedProjects = localStorage.getItem(STORAGE_KEY_PROJECTS);
        if (savedProjects) {
          const parsed = JSON.parse(savedProjects);
          if (Array.isArray(parsed)) {
            const realProjects = parsed.filter((p: any) => !p.id?.startsWith("proj-"));
            memoryState.projects = realProjects;
            localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(realProjects));
          }
        }

        const savedMode = localStorage.getItem(STORAGE_KEY_MODE);
        if (savedMode) memoryState.mode = savedMode as DashboardMode;

        // Ensure mock notifications & mock focus sessions are purged
        memoryState.notifications = [];
        memoryState.focusSessions = [];
        localStorage.removeItem(STORAGE_KEY_NOTIFS);
        localStorage.removeItem(STORAGE_KEY_FOCUS);

        memoryState.isLiveSynced = true;
        localStorage.setItem(STORAGE_KEY_IS_LIVE, "true");
      } catch (err) {
        console.warn("NEXUS: Failed to load cached state", err);
      }
    }

    const forceUpdate = () => setTick((t) => t + 1);
    listeners.add(forceUpdate);
    return () => {
      listeners.delete(forceUpdate);
    };
  }, []);

  const saveItems = (newItems: UnifiedItem[]) => {
    const { items: cleanItems } = scanAndAutoAssignExamTasks(newItems);
    memoryState.items = cleanItems;
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(cleanItems));
    }
    notifyListeners();
  };

  const saveProjects = (newProjects: Project[]) => {
    memoryState.projects = newProjects;
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(newProjects));
    }
    notifyListeners();
  };

  const setMode = useCallback((mode: DashboardMode) => {
    memoryState.mode = mode;
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY_MODE, mode);
    }
    notifyListeners();
  }, []);

  const toggleItemCompletion = useCallback((id: string) => {
    const updated = memoryState.items.map((item) => {
      if (item.id === id) {
        const newStatus: ItemStatus = item.status === "completed" ? "pending" : "completed";
        return {
          ...item,
          status: newStatus,
          updatedAt: new Date().toISOString(),
        };
      }
      return item;
    });
    saveItems(updated);
  }, []);

  const addItem = useCallback((item: Omit<UnifiedItem, "id" | "createdAt" | "updatedAt">) => {
    // Run autonomous smart triage across life & academic domains
    const triage = smartTriageItem({
      title: item.title,
      description: item.description,
      source: item.source,
      category: item.category,
      dueAt: item.dueAt,
      startAt: item.startAt,
    });

    let autoCategory = item.category;
    if (!autoCategory || autoCategory === "personal" || autoCategory === "calendar") {
      if (triage.domain === "exam" || triage.domain === "assignment") {
        autoCategory = "academic";
      } else if (triage.domain === "project_dev") {
        autoCategory = "project";
      }
    }

    const mergedTags = Array.from(new Set([...(item.tags || []), ...triage.tags]));

    const idPrefix = item.source === "google_calendar" ? "evt" : "nexus-task";
    const newItem: UnifiedItem = {
      ...item,
      category: autoCategory,
      priority: item.priority === "medium" && triage.priority !== "medium" ? triage.priority : item.priority,
      smartDomain: triage.domain,
      tags: mergedTags,
      id: `${idPrefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [newItem, ...memoryState.items];
    saveItems(updated);
    return newItem;
  }, []);

  const updateItem = useCallback((updatedItem: UnifiedItem) => {
    const updated = memoryState.items.map((item) =>
      item.id === updatedItem.id ? { ...updatedItem, updatedAt: new Date().toISOString() } : item
    );
    saveItems(updated);
  }, []);

  const deleteItem = useCallback((id: string) => {
    const updated = memoryState.items.filter((item) => item.id !== id);
    saveItems(updated);
  }, []);

  const addFocusSession = useCallback((session: Omit<FocusSession, "id">) => {
    const newSession: FocusSession = {
      ...session,
      id: `focus-${Date.now()}`,
    };
    memoryState.focusSessions = [newSession, ...memoryState.focusSessions];
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY_FOCUS, JSON.stringify(memoryState.focusSessions));
    }
    notifyListeners();
  }, []);

  const syncAll = useCallback(async () => {
    memoryState.isSyncing = true;
    notifyListeners();

    try {
      let credsPayload = {};
      if (typeof window !== "undefined") {
        const savedCreds = localStorage.getItem("nexus_credentials_v1");
        if (savedCreds) {
          try {
            credsPayload = { credentials: JSON.parse(savedCreds) };
          } catch {
            // ignore
          }
        }
      }

      // Call real live integrations sync endpoint
      const res = await fetch("/api/integrations/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credsPayload),
      });

      if (res.ok) {
        const data = await res.json();

        // 1. If backend refreshed credentials, save back to localStorage immediately
        if (data.updatedCredentials && typeof window !== "undefined") {
          try {
            const curCredsStr = localStorage.getItem("nexus_credentials_v1");
            const curCreds = curCredsStr ? JSON.parse(curCredsStr) : {};
            localStorage.setItem("nexus_credentials_v1", JSON.stringify({ ...curCreds, ...data.updatedCredentials }));
          } catch {}
        }

        // 2. Track sync errors vs success transparently
        if (data.errors && data.errors.length > 0) {
          const errMsg = data.errors.join("; ");
          memoryState.syncError = errMsg;
          const isAuthErr =
            errMsg.toLowerCase().includes("401") ||
            errMsg.toLowerCase().includes("unauthorized") ||
            errMsg.toLowerCase().includes("no google authorization token") ||
            errMsg.toLowerCase().includes("invalid_grant");
          memoryState.needsReauth = isAuthErr;
          memoryState.lastSyncedText = isAuthErr ? "Auth Expired" : "Sync Error";
        } else {
          memoryState.lastSyncedText = "Just now";
          memoryState.syncError = undefined;
          memoryState.needsReauth = false;
        }

        // 3. Process live items from Google Calendar / Tasks / Notion
        if (data.items && Array.isArray(data.items)) {
          // Purge all mock demo items once live items are received
          const liveExamNorms = new Set(
            data.items.filter((d: any) => d.id?.startsWith("gcal-")).map((d: any) => normalizeExamOrTaskTitle(d.title))
          );

          const nonLiveItems = memoryState.items.filter((item) => {
            if (item.id.startsWith("item-") && item.source !== "google_calendar") return false; // Strip out mock demo items!
            if (data.stats.googleTasks > 0 && item.id.startsWith("gtask-")) return false;
            if (data.stats.googleCalendar > 0 && item.id.startsWith("gcal-")) return false;
            if (data.stats.googleCalendar > 0 && item.id.startsWith("evt-") && liveExamNorms.has(normalizeExamOrTaskTitle(item.title))) {
              return false; // Google Calendar API event supersedes seeded fallback!
            }
            if (data.stats.notion > 0 && item.id.startsWith("notion-")) return false;
            return true;
          });

          const triagedLiveItems = data.items.map((item: any) => {
            const triage = smartTriageItem({
              title: item.title,
              description: item.description,
              source: item.source,
              category: item.category,
              dueAt: item.dueAt,
              startAt: item.startAt,
            });
            const mergedTags = Array.from(new Set([...(item.tags || []), ...triage.tags]));
            return {
              ...item,
              smartDomain: triage.domain,
              priority: item.priority === "medium" && triage.priority !== "medium" ? triage.priority : item.priority,
              tags: mergedTags,
            };
          });

          const merged = [...triagedLiveItems, ...nonLiveItems];
          const { items: scannedMerged } = scanAndAutoAssignExamTasks(merged);
          memoryState.items = scannedMerged;
          memoryState.isLiveSynced = true;
          if (typeof window !== "undefined") {
            localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(scannedMerged));
            localStorage.setItem(STORAGE_KEY_IS_LIVE, "true");
          }

          // If Notion items exist, automatically create/update an active Project entry
          if (data.stats.notion > 0) {
            const notionItems = merged.filter((i: any) => i.source === "notion");
            const completedCount = notionItems.filter((i: any) => i.status === "completed").length;
            const progress = notionItems.length > 0 ? Math.round((completedCount / notionItems.length) * 100) : 0;
            const notionProj: Project = {
              id: "notion-synced-db",
              name: "Notion Projects Database",
              description: "Live synced initiatives and tasks from your connected Notion database.",
              status: "in_progress",
              priority: "high",
              progress,
              tasksCount: notionItems.length,
              completedTasksCount: completedCount,
              notionUrl: "https://notion.so",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            const others = memoryState.projects.filter((p) => p.id !== "notion-synced-db" && !p.id.startsWith("proj-"));
            memoryState.projects = [notionProj, ...others];
            if (typeof window !== "undefined") {
              localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(memoryState.projects));
            }
          }

          // Update integration counts
          memoryState.integrations = memoryState.integrations.map((integ) => {
            if (integ.provider === "google_tasks" && data.stats.googleTasks > 0) {
              return { ...integ, itemCount: data.stats.googleTasks, isConnected: true, lastSyncedAt: "Just now" };
            }
            if (integ.provider === "google_calendar" && data.stats.googleCalendar > 0) {
              return { ...integ, itemCount: data.stats.googleCalendar, isConnected: true, lastSyncedAt: "Just now" };
            }
            if (integ.provider === "notion" && data.stats.notion > 0) {
              return { ...integ, itemCount: data.stats.notion, isConnected: true, lastSyncedAt: "Just now" };
            }
            return integ;
          });
        }
      } else {
        memoryState.lastSyncedText = "Sync failed";
        memoryState.syncError = `Server returned ${res.status}`;
      }
    } catch (err: any) {
      console.warn("Live sync error:", err);
      memoryState.lastSyncedText = "Sync failed";
      memoryState.syncError = err.message || "Network error";
    } finally {
      memoryState.isSyncing = false;
      notifyListeners();
    }
  }, []);

  const purgeDemoData = useCallback(() => {
    const realOnly = memoryState.items.filter(
      (item) =>
        !item.id.startsWith("item-") &&
        !item.externalId?.startsWith("gcal-os-class") &&
        !item.externalId?.startsWith("gc-")
    );
    memoryState.items = realOnly;
    memoryState.projects = memoryState.projects.filter((p) => !p.id.startsWith("proj-"));
    memoryState.notifications = [];
    memoryState.focusSessions = [];
    memoryState.isLiveSynced = true;
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(realOnly));
      localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(memoryState.projects));
      localStorage.removeItem(STORAGE_KEY_NOTIFS);
      localStorage.removeItem(STORAGE_KEY_FOCUS);
      localStorage.setItem(STORAGE_KEY_IS_LIVE, "true");
    }
    notifyListeners();
  }, []);

  const resetToDemo = useCallback(() => {
    memoryState.items = [];
    memoryState.projects = [];
    memoryState.notifications = [];
    memoryState.focusSessions = [];
    memoryState.mode = "default";
    memoryState.isLiveSynced = true;
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY_ITEMS);
      localStorage.removeItem(STORAGE_KEY_PROJECTS);
      localStorage.removeItem(STORAGE_KEY_MODE);
      localStorage.removeItem(STORAGE_KEY_FOCUS);
      localStorage.removeItem(STORAGE_KEY_NOTIFS);
      localStorage.setItem(STORAGE_KEY_IS_LIVE, "true");
    }
    notifyListeners();
  }, []);

  return {
    items: memoryState.items,
    projects: memoryState.projects,
    mode: memoryState.mode,
    notifications: memoryState.notifications,
    focusSessions: memoryState.focusSessions,
    integrations: memoryState.integrations,
    githubStats: MOCK_GITHUB_STATS,
    isSyncing: memoryState.isSyncing,
    lastSyncedText: memoryState.lastSyncedText,
    isLiveSynced: memoryState.isLiveSynced,
    syncError: memoryState.syncError,
    needsReauth: memoryState.needsReauth,
    setMode,
    toggleItemCompletion,
    addItem,
    updateItem,
    deleteItem,
    addFocusSession,
    saveProjects,
    syncAll,
    purgeDemoData,
    resetToDemo,
  };
}
