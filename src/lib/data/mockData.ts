import { UnifiedItem, Project, FocusSession, NotificationItem, IntegrationStatus } from "../types";

// Zero mock data: only real data from connected APIs (Google Calendar, Google Tasks, Notion) or user-created items will exist
export const MOCK_UNIFIED_ITEMS: UnifiedItem[] = [];

export const MOCK_PROJECTS: Project[] = [];

export const MOCK_INTEGRATIONS: IntegrationStatus[] = [
  {
    provider: "google_calendar",
    name: "Google Calendar",
    isConnected: false,
    itemCount: 0,
    lastSyncedAt: "Never",
    status: "idle",
  },
  {
    provider: "google_tasks",
    name: "Google Tasks",
    isConnected: false,
    itemCount: 0,
    lastSyncedAt: "Never",
    status: "idle",
  },
  {
    provider: "notion",
    name: "Notion Projects",
    isConnected: false,
    itemCount: 0,
    lastSyncedAt: "Never",
    status: "idle",
  },
  {
    provider: "google_classroom",
    name: "Google Classroom",
    isConnected: false,
    itemCount: 0,
    lastSyncedAt: "Never",
    status: "idle",
  },
  {
    provider: "github",
    name: "GitHub Activity",
    isConnected: false,
    itemCount: 0,
    lastSyncedAt: "Never",
    status: "idle",
  },
];

export const MOCK_GITHUB_STATS = {
  commitsThisWeek: 0,
  pullRequests: 0,
  issuesClosed: 0,
  streakDays: 0,
  recentCommits: [],
};

export const MOCK_FOCUS_SESSIONS: FocusSession[] = [];

export const MOCK_NOTIFICATIONS: NotificationItem[] = [];
