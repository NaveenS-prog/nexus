import { UnifiedItem } from "@/lib/types";
import { isExamItem, smartTriageItem } from "@/lib/nlp/itemClassifier";

/**
 * Autonomous Calendar Event Exam Scanner & Task Assigner:
 * Scans every calendar event, detects high-stakes exams, IAs, CATs, vivas, and tests,
 * and automatically creates & assigns an actionable reminder task for each exam.
 */
export function scanAndAutoAssignExamTasks(items: UnifiedItem[]): {
  items: UnifiedItem[];
  createdCount: number;
} {
  const existingTaskSignatures = new Set<string>();

  // 1. Index all existing reminder tasks by linkedEventId and normalized title + date
  items.forEach((item) => {
    if (item.metadata?.linkedEventId) {
      existingTaskSignatures.add(item.metadata.linkedEventId);
    }
    if (item.metadata?.isExamReminder) {
      existingTaskSignatures.add(item.id);
    }
    const sig = `${(item.title || "").toLowerCase().trim()}__${item.startAt || item.dueAt || ""}`;
    existingTaskSignatures.add(sig);
  });

  const newReminderTasks: UnifiedItem[] = [];

  // 2. Scan every event across the calendar
  items.forEach((item) => {
    const isCalendarEvent =
      item.source === "google_calendar" ||
      item.category === "calendar" ||
      Boolean(item.metadata?.isAllDay);

    if (isCalendarEvent && isExamItem(item)) {
      const eventSig = `${(item.title || "").toLowerCase().trim()}__${item.startAt || item.dueAt || ""}`;
      const alreadyHasTask =
        existingTaskSignatures.has(item.id) ||
        items.some((other) => other.metadata?.linkedEventId === item.id) ||
        item.metadata?.isExamReminder === true;

      if (!alreadyHasTask) {
        const triage = smartTriageItem({
          title: item.title,
          description: item.description,
          source: "nexus",
          dueAt: item.startAt || item.dueAt,
          startAt: item.startAt,
        });

        const assignedTask: UnifiedItem = {
          id: `task-exam-reminder-${item.id.replace(/^gcal-|^evt-/, "")}`,
          externalId: `reminder-${item.id}`,
          source: "nexus",
          title: item.title,
          description:
            item.description ||
            `Autonomous reminder for ${item.title}. Scheduled on ${item.startAt || item.dueAt || "upcoming"}.`,
          category: "academic",
          smartDomain: "exam",
          priority: "critical",
          status: item.status === "completed" ? "completed" : "pending",
          startAt: item.startAt,
          dueAt: item.startAt || item.dueAt,
          estimatedMinutes: item.estimatedMinutes || 90,
          tags: Array.from(new Set([...(item.tags || []), "Exam", "Reminder", "Academic"])),
          metadata: {
            ...item.metadata,
            linkedEventId: item.id,
            isExamReminder: true,
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        newReminderTasks.push(assignedTask);
        existingTaskSignatures.add(item.id);
        existingTaskSignatures.add(eventSig);
      }
    }
  });

  return {
    items: [...newReminderTasks, ...items],
    createdCount: newReminderTasks.length,
  };
}
