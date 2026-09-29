"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { 
  UnifiedItem, 
  Project, 
  DashboardMode, 
  NotificationItem, 
  IntegrationStatus, 
  FocusSession,
  ItemStatus,
  ConnectedAccount,
  GlobalAccountFilter,
  AccountType
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
import { addDays, format } from "date-fns";

const STORAGE_KEY_ITEMS = "nexus_items_v1";
const STORAGE_KEY_PROJECTS = "nexus_projects_v1";
const STORAGE_KEY_MODE = "nexus_mode_v1";
const STORAGE_KEY_FOCUS = "nexus_focus_sessions_v1";
const STORAGE_KEY_NOTIFS = "nexus_notifications_v1";
const STORAGE_KEY_IS_LIVE = "nexus_is_live_v1";
const STORAGE_KEY_CONNECTED_ACCOUNTS = "nexus_connected_accounts_v1";
const STORAGE_KEY_ACCOUNT_FILTER = "nexus_account_filter_v1";

let memoryState: {
  items: UnifiedItem[];
  projects: Project[];
  mode: DashboardMode;
  notifications: NotificationItem[];
  focusSessions: FocusSession[];
  integrations: IntegrationStatus[];
  connectedAccounts: ConnectedAccount[];
  selectedAccountFilter: GlobalAccountFilter;
  isSyncing: boolean;
  lastSyncedText: string;
  isLiveSynced: boolean;
  syncError?: string;
  needsReauth?: boolean;
} = {
  items: [],
  projects: [],
  mode: "default",
  notifications: [],
  focusSessions: [],
  integrations: MOCK_INTEGRATIONS,
  connectedAccounts: [],
  selectedAccountFilter: "all",
  isSyncing: false,
  lastSyncedText: "Never",
  isLiveSynced: false,
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
    if (typeof window !== "undefined") {
      try {
        const savedItems = localStorage.getItem(STORAGE_KEY_ITEMS);
        if (savedItems) {
          const parsed = JSON.parse(savedItems);
          if (Array.isArray(parsed)) {
            const realOnly = parsed.filter(
              (i: any) =>
                !i.id?.startsWith("evt-") &&
                !/^item-[0-9]{1,3}$/.test(i.id || "") &&
                !i.id?.startsWith("mock-") &&
                !i.externalId?.startsWith("gcal-os-class") &&
                !i.externalId?.startsWith("gc-") &&
                !i.externalId?.startsWith("gcal-lunch")
            );

            const { items: scannedItems } = scanAndAutoAssignExamTasks(realOnly);
            memoryState.items = scannedItems;
            localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(scannedItems));
          }
        } else {
          memoryState.items = [];
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

        const savedFilter = localStorage.getItem(STORAGE_KEY_ACCOUNT_FILTER);
        if (savedFilter) memoryState.selectedAccountFilter = savedFilter as GlobalAccountFilter;

        const savedAccounts = localStorage.getItem(STORAGE_KEY_CONNECTED_ACCOUNTS);
        if (savedAccounts) {
          try {
            memoryState.connectedAccounts = JSON.parse(savedAccounts);
          } catch {}
        }

        memoryState.notifications = [];
        memoryState.focusSessions = [];
        localStorage.removeItem(STORAGE_KEY_NOTIFS);
        localStorage.removeItem(STORAGE_KEY_FOCUS);

        memoryState.isLiveSynced = true;
        localStorage.setItem(STORAGE_KEY_IS_LIVE, "true");

        // Query live integration connection status and multi-account inventory
        fetch("/api/integrations/status")
          .then((res) => res.json())
          .then((status) => {
            if (status) {
              if (status.connectedAccounts && Array.isArray(status.connectedAccounts)) {
                memoryState.connectedAccounts = status.connectedAccounts;
                localStorage.setItem(STORAGE_KEY_CONNECTED_ACCOUNTS, JSON.stringify(status.connectedAccounts));
              }

              memoryState.integrations = memoryState.integrations.map((integ) => {
                if (integ.provider === "google_calendar" || integ.provider === "google_tasks") {
                  return {
                    ...integ,
                    isConnected: Boolean(status.google?.connected),
                  };
                }
                if (integ.provider === "notion") {
                  return {
                    ...integ,
                    isConnected: Boolean(status.notion?.connected),
                  };
                }
                return integ;
              });
              notifyListeners();
            }
          })
          .catch(() => {});
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

  const setAccountFilter = useCallback((filter: GlobalAccountFilter) => {
    memoryState.selectedAccountFilter = filter;
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY_ACCOUNT_FILTER, filter);
    }
    notifyListeners();
  }, []);

  const toggleItemCompletion = useCallback((id: string) => {
    let toggledItem: UnifiedItem | undefined = undefined;
    const updated = memoryState.items.map((item) => {
      if (item.id === id) {
        const newStatus: ItemStatus = item.status === "completed" ? "pending" : "completed";
        toggledItem = {
          ...item,
          status: newStatus,
          updatedAt: new Date().toISOString(),
        };
        return toggledItem;
      }
      return item;
    });
    saveItems(updated);

    if (toggledItem && ((toggledItem as UnifiedItem).source === "google_tasks" || id.startsWith("gtask-"))) {
      fetch("/api/integrations/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle_status",
          id,
          accountId: (toggledItem as UnifiedItem).connectedAccountId,
          isCompleted: (toggledItem as UnifiedItem).status === "completed",
        }),
      }).catch((e) => console.warn("Background Google Tasks status sync failed", e));
    }
  }, []);

  const addItem = useCallback((item: Omit<UnifiedItem, "id" | "createdAt" | "updatedAt">) => {
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

    const isCalendarEvent = item.category === "calendar" || item.source === "google_calendar" || Boolean(item.startAt && !item.startAt.includes("T00:00:00"));
    const idPrefix = isCalendarEvent ? "manual-calendar" : "nexus-task";
    const tempId = `${idPrefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    // Resolve target account based on item or current global account filter
    let targetAccountType: AccountType | undefined = item.accountType;
    let targetAccountId = item.connectedAccountId;
    let targetAccountEmail = item.accountEmail;

    if (!targetAccountType && memoryState.selectedAccountFilter !== "all") {
      if (["personal", "university", "work", "other"].includes(memoryState.selectedAccountFilter)) {
        targetAccountType = memoryState.selectedAccountFilter as AccountType;
        const match = memoryState.connectedAccounts.find((a) => a.accountType === targetAccountType);
        if (match) {
          targetAccountId = match.id;
          targetAccountEmail = match.email;
        }
      } else {
        const match = memoryState.connectedAccounts.find((a) => a.id === memoryState.selectedAccountFilter);
        if (match) {
          targetAccountId = match.id;
          targetAccountType = match.accountType;
          targetAccountEmail = match.email;
        }
      }
    }

    const newItem: UnifiedItem = {
      ...item,
      category: autoCategory,
      priority: item.priority === "medium" && triage.priority !== "medium" ? triage.priority : item.priority,
      smartDomain: triage.domain,
      tags: mergedTags,
      id: tempId,
      connectedAccountId: targetAccountId,
      accountType: targetAccountType || (autoCategory === "academic" ? "university" : "personal"),
      accountEmail: targetAccountEmail,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [newItem, ...memoryState.items];
    saveItems(updated);

    // Live push to Google Calendar or Google Tasks targeting the specific connected account
    if (typeof window !== "undefined") {
      fetch("/api/integrations/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          type: isCalendarEvent ? "event" : "task",
          item: newItem,
          accountId: targetAccountId,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.googleId) {
            memoryState.items = memoryState.items.map((i) =>
              i.id === tempId
                ? {
                    ...i,
                    id: data.googleId,
                    externalId: data.externalId || data.googleId.replace(/^(gcal|gtask)-/, ""),
                    source: isCalendarEvent ? "google_calendar" : "google_tasks",
                    url: data.url || i.url,
                    metadata: {
                      ...(i.metadata || {}),
                      syncStatus: "synced_to_google",
                    },
                  }
                : i
            );
            localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(memoryState.items));
            notifyListeners();
          } else if (data.notConnected) {
            memoryState.items = memoryState.items.map((i) =>
              i.id === tempId
                ? {
                    ...i,
                    metadata: {
                      ...(i.metadata || {}),
                      syncStatus: "local_only",
                    },
                  }
                : i
            );
            localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(memoryState.items));
            notifyListeners();
          }
        })
        .catch((e) => console.warn("Background Google push failed", e));
    }

    return newItem;
  }, []);

  const updateItem = useCallback((updatedItem: UnifiedItem) => {
    const updated = memoryState.items.map((item) =>
      item.id === updatedItem.id ? { ...updatedItem, updatedAt: new Date().toISOString() } : item
    );
    saveItems(updated);
  }, []);

  const deleteItem = useCallback((id: string) => {
    const itemToDelete = memoryState.items.find((item) => item.id === id);
    const updated = memoryState.items.filter((item) => item.id !== id);
    saveItems(updated);

    if (itemToDelete && (id.startsWith("gcal-") || id.startsWith("gtask-"))) {
      fetch("/api/integrations/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete",
          id,
          accountId: itemToDelete.connectedAccountId,
        }),
      }).catch((e) => console.warn("Background Google delete failed", e));
    }
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

  const syncAll = useCallback(async (targetAccountId?: string) => {
    memoryState.isSyncing = true;
    notifyListeners();

    try {
      const res = await fetch("/api/integrations/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: targetAccountId }),
      });

      if (res.ok) {
        const data = await res.json();

        if (data.errors && data.errors.length > 0) {
          const errMsg = data.errors.join("; ");
          memoryState.syncError = errMsg;
          const isAuthErr =
            errMsg.toLowerCase().includes("401") ||
            errMsg.toLowerCase().includes("unauthorized") ||
            errMsg.toLowerCase().includes("no google authorization token") ||
            errMsg.toLowerCase().includes("invalid_grant");
          memoryState.needsReauth = isAuthErr;
          memoryState.lastSyncedText = isAuthErr ? "Auth Required" : "Sync Notice";
        } else {
          memoryState.lastSyncedText = "Just now";
          memoryState.syncError = undefined;
          memoryState.needsReauth = false;
        }

        if (data.items && Array.isArray(data.items)) {
          const gcalSynced = (data.stats?.googleCalendar ?? 0) > 0;
          const gtasksSynced = (data.stats?.googleTasks ?? 0) > 0;
          const gclassSynced = (data.stats?.googleClassroom ?? 0) > 0;
          const notionSynced = (data.stats?.notion ?? 0) > 0;

          if (!gcalSynced && !gtasksSynced && !gclassSynced && !notionSynced && data.items.length === 0) {
            return;
          }

          const nonLiveItems = memoryState.items.filter((item) => {
            if (item.id.startsWith("evt-")) return false;
            if (item.id.startsWith("mock-")) return false;
            if (/^item-[0-9]{1,3}$/.test(item.id)) return false;

            if (gcalSynced && (item.source === "google_calendar" || item.id.startsWith("gcal-"))) {
              if (targetAccountId && item.connectedAccountId !== targetAccountId) return true;
              return false;
            }
            if (gtasksSynced && (item.source === "google_tasks" || item.id.startsWith("gtask-"))) {
              if (targetAccountId && item.connectedAccountId !== targetAccountId) return true;
              return false;
            }
            if (gclassSynced && (item.source === "google_classroom" || item.id.startsWith("gclassroom-"))) {
              if (targetAccountId && item.connectedAccountId !== targetAccountId) return true;
              return false;
            }
            if (notionSynced && (item.source === "notion" || item.id.startsWith("notion-"))) {
              return false;
            }
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

          // Refresh status to update per-account sync metadata
          fetch("/api/integrations/status")
            .then((r) => r.json())
            .then((s) => {
              if (s?.connectedAccounts) {
                memoryState.connectedAccounts = s.connectedAccounts;
                localStorage.setItem(STORAGE_KEY_CONNECTED_ACCOUNTS, JSON.stringify(s.connectedAccounts));
                notifyListeners();
              }
            })
            .catch(() => {});
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

  const disconnectAccount = useCallback(async (accountId: string) => {
    try {
      const res = await fetch(`/api/integrations/accounts?accountId=${encodeURIComponent(accountId)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        const data = await res.json();
        if (data.accounts) {
          memoryState.connectedAccounts = data.accounts;
          localStorage.setItem(STORAGE_KEY_CONNECTED_ACCOUNTS, JSON.stringify(data.accounts));
        }
      }
    } catch (err) {
      console.error("Failed to disconnect account:", err);
    }

    // Purge items belonging to this disconnected account
    const remaining = memoryState.items.filter((item) => item.connectedAccountId !== accountId);
    saveItems(remaining);
    notifyListeners();
  }, []);

  const updateAccount = useCallback(async (accountId: string, updates: Partial<ConnectedAccount>) => {
    try {
      const res = await fetch("/api/integrations/accounts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId,
          ...updates,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.accounts) {
          memoryState.connectedAccounts = data.accounts;
          localStorage.setItem(STORAGE_KEY_CONNECTED_ACCOUNTS, JSON.stringify(data.accounts));
          notifyListeners();
        }
      }
    } catch (err) {
      console.error("Failed to update account:", err);
    }
  }, []);

  const loadDemoAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/integrations/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "load_demo_accounts" }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.accounts) {
          memoryState.connectedAccounts = data.accounts;
          localStorage.setItem(STORAGE_KEY_CONNECTED_ACCOUNTS, JSON.stringify(data.accounts));
        }
      }
    } catch (err) {
      console.warn("Demo accounts setup error:", err);
    }

    const now = new Date();
    const todayStr = format(now, "yyyy-MM-dd");
    const tomorrowStr = format(addDays(now, 1), "yyyy-MM-dd");
    const inTwoDaysStr = format(addDays(now, 2), "yyyy-MM-dd");
    const inFourDaysStr = format(addDays(now, 4), "yyyy-MM-dd");
    const inFiveDaysStr = format(addDays(now, 5), "yyyy-MM-dd");

    const demoItems: UnifiedItem[] = [
      // 1. Personal Account: Calendar & Tasks
      {
        id: "demo-personal-event-1",
        externalId: "pevt-1",
        source: "google_calendar",
        title: "Dentist Routine Cleaning & Checkup",
        category: "personal",
        priority: "medium",
        status: "pending",
        startAt: `${tomorrowStr}T10:00:00`,
        dueAt: `${tomorrowStr}T11:00:00`,
        estimatedMinutes: 60,
        tags: ["Calendar", "Personal", "Health"],
        connectedAccountId: "google-demo-personal",
        accountType: "personal",
        accountEmail: "personal.demo@example.local",
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      },
      {
        id: "demo-personal-task-1",
        externalId: "ptsk-1",
        source: "google_tasks",
        title: "Renew car insurance policy",
        description: "Compare online quotes and renew before end of month",
        category: "personal",
        priority: "high",
        status: "pending",
        dueAt: `${tomorrowStr}T23:59:59`,
        estimatedMinutes: 30,
        tags: ["Google Tasks", "Personal"],
        connectedAccountId: "google-demo-personal",
        accountType: "personal",
        accountEmail: "personal.demo@example.local",
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      },
      {
        id: "demo-personal-task-2",
        externalId: "ptsk-2",
        source: "google_tasks",
        title: "Buy organic groceries & dark roast coffee beans",
        category: "personal",
        priority: "medium",
        status: "pending",
        dueAt: `${todayStr}T23:59:59`,
        estimatedMinutes: 45,
        tags: ["Google Tasks", "Personal"],
        connectedAccountId: "google-demo-personal",
        accountType: "personal",
        accountEmail: "personal.demo@example.local",
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      },

      // 2. University Account: Classroom & Academic Calendar
      {
        id: "demo-uni-classroom-1",
        externalId: "uwork-1",
        source: "google_classroom",
        title: "OS Lab 4: Page Replacement Algorithm (LRU & FIFO)",
        description: "[Operating Systems CS301] Implement page replacement simulator and submit analysis report with graph visualizations.",
        category: "academic",
        priority: "critical",
        status: "pending",
        dueAt: `${inTwoDaysStr}T23:59:59`,
        estimatedMinutes: 90,
        url: "https://classroom.google.com",
        tags: ["Google Classroom", "Operating Systems", "University", "Assignment"],
        connectedAccountId: "google-demo-university",
        accountType: "university",
        accountEmail: "student.demo@university.example",
        metadata: { courseName: "Operating Systems (CS301)", maxPoints: 100 },
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      },
      {
        id: "demo-uni-classroom-2",
        externalId: "uwork-2",
        source: "google_classroom",
        title: "Database Normalization Milestone 2 (BCNF & 3NF Schema Decomposition)",
        description: "[Database Systems CS304] Submit normalized relation diagrams and SQL DDL scripts.",
        category: "academic",
        priority: "high",
        status: "pending",
        dueAt: `${inFourDaysStr}T23:59:59`,
        estimatedMinutes: 75,
        url: "https://classroom.google.com",
        tags: ["Google Classroom", "Database Systems", "University", "Assignment"],
        connectedAccountId: "google-demo-university",
        accountType: "university",
        accountEmail: "student.demo@university.example",
        metadata: { courseName: "Database Systems (CS304)", maxPoints: 50 },
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      },
      {
        id: "demo-uni-event-exam",
        externalId: "uevt-exam",
        source: "google_calendar",
        title: "Midterm Exam: Theory of Computation & Automata (CS305)",
        description: "Midterm evaluation covering Regular Languages, NFAs/DFAs, and Context-Free Grammars. Room 302.",
        category: "academic",
        priority: "critical",
        status: "pending",
        startAt: `${inFiveDaysStr}T09:30:00`,
        dueAt: `${inFiveDaysStr}T11:30:00`,
        estimatedMinutes: 120,
        tags: ["Exam", "Calendar", "University"],
        connectedAccountId: "google-demo-university",
        accountType: "university",
        accountEmail: "student.demo@university.example",
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      },
      {
        id: "demo-uni-event-lecture",
        externalId: "uevt-lecture",
        source: "google_calendar",
        title: "Computer Networks CS303: TCP BBR & Congestion Control",
        description: "Prof. Anderson - Hall B. Bring laptop for Wireshark packet capture demo.",
        category: "academic",
        priority: "medium",
        status: "pending",
        startAt: `${tomorrowStr}T14:00:00`,
        dueAt: `${tomorrowStr}T15:30:00`,
        estimatedMinutes: 90,
        tags: ["Lecture", "Calendar", "University"],
        connectedAccountId: "google-demo-university",
        accountType: "university",
        accountEmail: "student.demo@university.example",
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      },
    ];

    if (memoryState.connectedAccounts.length === 0) {
      memoryState.connectedAccounts = [
        {
          id: "google-demo-personal",
          provider: "google",
          providerAccountId: "demo-personal-001",
          email: "personal.demo@example.local",
          displayName: "Personal Account",
          accountType: "personal",
          status: "active",
          isDefault: true,
          services: ["calendar", "tasks", "drive"],
          connectedAt: now.toISOString(),
          lastUsedAt: now.toISOString(),
        },
        {
          id: "google-demo-university",
          provider: "google",
          providerAccountId: "demo-university-002",
          email: "student.demo@university.example",
          displayName: "University Account",
          accountType: "university",
          status: "active",
          isDefault: false,
          services: ["classroom", "calendar", "drive", "tasks"],
          connectedAt: now.toISOString(),
          lastUsedAt: now.toISOString(),
        },
      ];
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY_CONNECTED_ACCOUNTS, JSON.stringify(memoryState.connectedAccounts));
      }
    }

    saveItems(demoItems);
    notifyListeners();
  }, []);

  const disconnectGoogle = useCallback(async () => {
    try {
      await fetch("/api/integrations/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disconnect_google" }),
      });
    } catch {}

    const remaining = memoryState.items.filter(
      (item) => item.source !== "google_calendar" && item.source !== "google_tasks" && item.source !== "google_classroom" &&
        !item.id.startsWith("gcal-") && !item.id.startsWith("gtask-") && !item.id.startsWith("gclassroom-")
    );
    memoryState.items = remaining;
    memoryState.connectedAccounts = [];
    memoryState.lastSyncedText = "Never";
    memoryState.needsReauth = false;
    memoryState.syncError = undefined;
    memoryState.integrations = memoryState.integrations.map((integ) =>
      integ.provider === "google_calendar" || integ.provider === "google_tasks"
        ? { ...integ, isConnected: false, itemCount: 0, lastSyncedAt: "Never" }
        : integ
    );
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(remaining));
      localStorage.removeItem(STORAGE_KEY_CONNECTED_ACCOUNTS);
    }
    notifyListeners();
  }, []);

  const disconnectNotion = useCallback(async () => {
    try {
      await fetch("/api/integrations/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disconnect_notion" }),
      });
    } catch {}

    const remaining = memoryState.items.filter(
      (item) => item.source !== "notion" && !item.id.startsWith("notion-")
    );
    memoryState.items = remaining;
    memoryState.projects = memoryState.projects.filter((p) => p.id !== "notion-synced-db");
    memoryState.integrations = memoryState.integrations.map((integ) =>
      integ.provider === "notion"
        ? { ...integ, isConnected: false, itemCount: 0, lastSyncedAt: "Never" }
        : integ
    );
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(remaining));
      localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(memoryState.projects));
    }
    notifyListeners();
  }, []);

  const purgeDemoData = useCallback(() => {
    const realOnly = memoryState.items.filter(
      (item) =>
        !item.id.startsWith("evt-") &&
        !item.id.startsWith("mock-") &&
        !item.id.startsWith("demo-") &&
        !/^item-[0-9]{1,3}$/.test(item.id || "") &&
        !item.externalId?.startsWith("gcal-os-class") &&
        !item.externalId?.startsWith("gc-")
    );
    memoryState.items = realOnly;
    memoryState.projects = memoryState.projects.filter((p) => !p.id.startsWith("proj-"));
    memoryState.notifications = [];
    memoryState.focusSessions = [];
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(realOnly));
      localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(memoryState.projects));
      localStorage.removeItem(STORAGE_KEY_NOTIFS);
      localStorage.removeItem(STORAGE_KEY_FOCUS);
    }
    notifyListeners();
  }, []);

  const resetToDemo = useCallback(() => {
    memoryState.items = [];
    memoryState.projects = [];
    memoryState.notifications = [];
    memoryState.focusSessions = [];
    memoryState.connectedAccounts = [];
    memoryState.selectedAccountFilter = "all";
    memoryState.mode = "default";
    memoryState.isLiveSynced = false;
    memoryState.lastSyncedText = "Never";
    memoryState.syncError = undefined;
    memoryState.needsReauth = false;
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY_ITEMS);
      localStorage.removeItem(STORAGE_KEY_PROJECTS);
      localStorage.removeItem(STORAGE_KEY_MODE);
      localStorage.removeItem(STORAGE_KEY_FOCUS);
      localStorage.removeItem(STORAGE_KEY_NOTIFS);
      localStorage.removeItem(STORAGE_KEY_IS_LIVE);
      localStorage.removeItem(STORAGE_KEY_CONNECTED_ACCOUNTS);
      localStorage.removeItem(STORAGE_KEY_ACCOUNT_FILTER);
    }
    notifyListeners();
  }, []);

  const checkIntegrationStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/integrations/status");
      if (res.ok) {
        const status = await res.json();
        if (status.connectedAccounts) {
          memoryState.connectedAccounts = status.connectedAccounts;
          localStorage.setItem(STORAGE_KEY_CONNECTED_ACCOUNTS, JSON.stringify(status.connectedAccounts));
        }
        memoryState.integrations = memoryState.integrations.map((integ) => {
          if (integ.provider === "google_calendar" || integ.provider === "google_tasks") {
            return {
              ...integ,
              isConnected: Boolean(status.google?.connected),
            };
          }
          if (integ.provider === "notion") {
            return {
              ...integ,
              isConnected: Boolean(status.notion?.connected),
            };
          }
          return integ;
        });
        notifyListeners();
        return status;
      }
    } catch (e) {
      console.warn("Failed to check integration status", e);
    }
  }, []);

  // Filter items dynamically based on active selectedAccountFilter
  const filteredItems = useMemo(() => {
    const filter = memoryState.selectedAccountFilter;
    if (!filter || filter === "all") return memoryState.items;

    if (filter === "personal") {
      return memoryState.items.filter(
        (i) => i.accountType === "personal" || (!i.accountType && i.category === "personal")
      );
    }

    if (filter === "university") {
      return memoryState.items.filter(
        (i) =>
          i.accountType === "university" ||
          i.category === "academic" ||
          i.tags?.includes("University") ||
          i.tags?.includes("Google Classroom")
      );
    }

    if (filter === "work") {
      return memoryState.items.filter((i) => i.accountType === "work" || i.category === "project");
    }

    if (filter === "other") {
      return memoryState.items.filter((i) => i.accountType === "other");
    }

    // Filter by specific connected account ID
    return memoryState.items.filter((i) => i.connectedAccountId === filter);
  }, [memoryState.items, memoryState.selectedAccountFilter]);

  return {
    items: memoryState.items,
    filteredItems,
    projects: memoryState.projects,
    mode: memoryState.mode,
    notifications: memoryState.notifications,
    focusSessions: memoryState.focusSessions,
    integrations: memoryState.integrations,
    connectedAccounts: memoryState.connectedAccounts,
    selectedAccountFilter: memoryState.selectedAccountFilter,
    githubStats: MOCK_GITHUB_STATS,
    isSyncing: memoryState.isSyncing,
    lastSyncedText: memoryState.lastSyncedText,
    isLiveSynced: memoryState.isLiveSynced,
    syncError: memoryState.syncError,
    needsReauth: memoryState.needsReauth,
    setMode,
    setAccountFilter,
    toggleItemCompletion,
    addItem,
    updateItem,
    deleteItem,
    addFocusSession,
    saveProjects,
    syncAll,
    disconnectAccount,
    updateAccount,
    loadDemoAccounts,
    purgeDemoData,
    resetToDemo,
    disconnectGoogle,
    disconnectNotion,
    checkIntegrationStatus,
  };
}
