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
  items: MOCK_UNIFIED_ITEMS,
  projects: MOCK_PROJECTS,
  mode: "default",
  notifications: MOCK_NOTIFICATIONS,
  focusSessions: MOCK_FOCUS_SESSIONS,
  integrations: MOCK_INTEGRATIONS,
  isSyncing: false,
  lastSyncedText: "2 min ago",
  isLiveSynced: false,
};

const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

export function useNexusStore() {
  const [, setTick] = useState(0);

  useEffect(() => {
    // Hydrate from localStorage if available
    if (typeof window !== "undefined") {
      try {
        const savedItems = localStorage.getItem(STORAGE_KEY_ITEMS);
        if (savedItems) memoryState.items = JSON.parse(savedItems);

        const savedProjects = localStorage.getItem(STORAGE_KEY_PROJECTS);
        if (savedProjects) memoryState.projects = JSON.parse(savedProjects);

        const savedMode = localStorage.getItem(STORAGE_KEY_MODE);
        if (savedMode) memoryState.mode = savedMode as DashboardMode;

        const savedNotifs = localStorage.getItem(STORAGE_KEY_NOTIFS);
        if (savedNotifs) memoryState.notifications = JSON.parse(savedNotifs);

        const savedFocus = localStorage.getItem(STORAGE_KEY_FOCUS);
        if (savedFocus) memoryState.focusSessions = JSON.parse(savedFocus);

        const savedIsLive = localStorage.getItem(STORAGE_KEY_IS_LIVE);
        if (savedIsLive) memoryState.isLiveSynced = JSON.parse(savedIsLive);
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
          // Keep non-synced items (e.g. internal nexus tasks, academic items)
          const nonLiveItems = memoryState.items.filter((item) => {
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

  const resetToDemo = useCallback(() => {
    memoryState.items = MOCK_UNIFIED_ITEMS;
    memoryState.projects = MOCK_PROJECTS;
    memoryState.notifications = MOCK_NOTIFICATIONS;
    memoryState.mode = "default";
    memoryState.isLiveSynced = false;
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY_ITEMS);
      localStorage.removeItem(STORAGE_KEY_PROJECTS);
      localStorage.removeItem(STORAGE_KEY_MODE);
      localStorage.removeItem(STORAGE_KEY_FOCUS);
      localStorage.removeItem(STORAGE_KEY_NOTIFS);
      localStorage.removeItem(STORAGE_KEY_IS_LIVE);
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
    resetToDemo,
  };
}
