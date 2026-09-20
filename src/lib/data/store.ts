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

const STORAGE_KEY_ITEMS = "nexus_items_v1";
const STORAGE_KEY_PROJECTS = "nexus_projects_v1";
const STORAGE_KEY_MODE = "nexus_mode_v1";
const STORAGE_KEY_FOCUS = "nexus_focus_sessions_v1";
const STORAGE_KEY_NOTIFS = "nexus_notifications_v1";
const STORAGE_KEY_IS_LIVE = "nexus_is_live_v1";

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
} = {
  items: [],
  projects: [],
  mode: "default",
  notifications: [],
  focusSessions: [],
  integrations: MOCK_INTEGRATIONS,
  isSyncing: false,
  lastSyncedText: "Never",
  isLiveSynced: true,
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
            // Strip out ANY item that is a mock/demo item
            const realOnly = parsed.filter(
              (i: any) =>
                !i.id?.startsWith("item-") &&
                !i.externalId?.startsWith("gcal-os-class") &&
                !i.externalId?.startsWith("gc-") &&
                !i.externalId?.startsWith("gcal-lunch")
            );
            memoryState.items = realOnly;
            localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(realOnly));
          }
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
    memoryState.items = newItems;
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(newItems));
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
    const newItem: UnifiedItem = {
      ...item,
      id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
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
        if (data.items && data.items.length > 0) {
          // Purge all mock demo items once live items are received
          const nonLiveItems = memoryState.items.filter((item) => {
            if (item.id.startsWith("item-")) return false; // Strip out mock demo items!
            if (data.stats.googleTasks > 0 && item.source === "google_tasks") return false;
            if (data.stats.googleCalendar > 0 && item.source === "google_calendar") return false;
            if (data.stats.notion > 0 && item.source === "notion") return false;
            return true;
          });

          const merged = [...data.items, ...nonLiveItems];
          memoryState.items = merged;
          memoryState.isLiveSynced = true;
          if (typeof window !== "undefined") {
            localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(merged));
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
      }
    } catch (err) {
      console.warn("Live sync check error, continuing with local cache", err);
    } finally {
      memoryState.isSyncing = false;
      memoryState.lastSyncedText = "Just now";
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
