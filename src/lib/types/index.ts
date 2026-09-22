export type Source =
  | "google_tasks"
  | "google_classroom"
  | "google_calendar"
  | "notion"
  | "github"
  | "nexus";

export type Category =
  | "academic"
  | "personal"
  | "project"
  | "calendar"
  | "idea";

export type Priority =
  | "low"
  | "medium"
  | "high"
  | "critical";

export type ItemStatus = "pending" | "in_progress" | "completed";

export type DashboardMode = "default" | "exam" | "build";

export interface UnifiedItem {
  id: string;
  externalId?: string;
  source: Source;
  title: string;
  description?: string;
  category: Category;
  priority: Priority;
  status: ItemStatus;
  startAt?: string; // ISO 8601
  dueAt?: string;   // ISO 8601
  estimatedMinutes?: number;
  url?: string;
  projectId?: string;
  courseName?: string;
  tags?: string[];
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectNode {
  id: string;
  label: string;
  status: "completed" | "in_progress" | "pending";
  dependsOn?: string[];
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: "idea" | "planning" | "in_progress" | "paused" | "completed";
  priority: Priority;
  progress: number; // 0 - 100
  deadline?: string;
  githubRepo?: string;
  notionUrl?: string;
  color?: string;
  tasksCount: number;
  completedTasksCount: number;
  nodes?: ProjectNode[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectTask {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  status: "backlog" | "in_progress" | "review" | "done";
  priority: Priority;
  orderIndex: number;
}

export interface FocusSession {
  id: string;
  title: string;
  projectId?: string;
  taskId?: string;
  startedAt: string;
  endedAt?: string;
  durationMinutes: number;
  completed: boolean;
  ambientSound?: string;
}

export interface NotificationItem {
  id: string;
  type: "deadline_warning" | "overdue_task" | "workload_warning" | "sync_status" | "focus_completed";
  title: string;
  message: string;
  severity: "info" | "warning" | "critical" | "success";
  isRead: boolean;
  linkUrl?: string;
  createdAt: string;
}

export interface UserPreferences {
  theme: "dark" | "light" | "system";
  preferredMode: DashboardMode;
  focusDurationMinutes: number;
  workStartHour: number;
  workEndHour: number;
  ambientVolume: number;
  lastAmbientSound: string;
  autoDailyBriefing: boolean;
}

export interface WorkloadDay {
  date: string; // YYYY-MM-DD
  dayLabel: string; // e.g. "Mon"
  dayNumber: number; // 1 - 31
  formattedDate: string; // e.g. "Mon, Sep 22"
  totalScore: number; // 0 - 100 workload index
  tasksCount: number;
  deadlinesCount: number;
  calendarMinutes: number;
  items: UnifiedItem[];
  isToday: boolean;
  isCrunchDay: boolean; // overloaded
}

export interface RecommendationResult {
  item: UnifiedItem;
  reason: string;
  availableMinutes?: number;
  urgencyScore: number;
}

export interface DailyBriefing {
  date: string;
  greeting: string;
  totalTasks: number;
  urgentDeadlinesCount: number;
  heaviestDayName: string;
  recommendedOrder: {
    id: string;
    title: string;
    priority: Priority;
    estimatedMinutes: number;
    category: Category;
  }[];
  totalEstimatedMinutes: number;
}

export interface ParsedDumpItem {
  id: string;
  title: string;
  type: "task" | "idea" | "note";
  targetDestination: "google_tasks" | "notion" | "nexus";
  category: Category;
  priority: Priority;
  dueAt?: string;
  estimatedMinutes?: number;
}

export interface IntegrationStatus {
  provider: Source;
  name: string;
  isConnected: boolean;
  itemCount: number;
  lastSyncedAt?: string;
  status: "idle" | "syncing" | "success" | "error" | "needs_reconnect";
  errorMessage?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  startTime: string; // ISO 8601
  endTime: string;   // ISO 8601
  allDay?: boolean;
  location?: string;
  url?: string;
  description?: string;
}

export interface ParsedSlotCommand {
  isSlotCommand: boolean;
  rawQuery: string;
  taskTitle: string;
  targetDate: Date | null;
  targetDateFormatted: string | null; // YYYY-MM-DD
  targetDateLabel: string | null;     // e.g. "Wednesday, Sep 23"
  durationMinutes: number;
  hasExplicitTime?: boolean;
}

export interface FreeSlotResult {
  start: string; // ISO-8601
  end: string;   // ISO-8601
  formattedDate: string; // e.g. "Wednesday, Sep 23"
  formattedTimeRange: string; // e.g. "10:30 AM – 11:30 AM"
  taskTitle: string;
}
