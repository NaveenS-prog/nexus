import { UnifiedItem, DashboardMode, RecommendationResult } from "../types";
import { parseISO, differenceInHours, differenceInMinutes, isBefore, isAfter, addHours } from "date-fns";
import { isExamItem } from "../nlp/itemClassifier";

export function recommendNextTask(
  items: UnifiedItem[],
  mode: DashboardMode = "default",
  now: Date = new Date()
): RecommendationResult | null {
  // 1. Filter out completed tasks and generic past calendar events
  const candidateTasks = items.filter((item) => {
    if (item.status === "completed") return false;
    if (item.category === "calendar") {
      // Don't recommend a calendar event as a task to do
      return false;
    }
    return true;
  });

  if (candidateTasks.length === 0) {
    return null;
  }

  // 2. Check current calendar availability (next 2 hours)
  const upcomingCalendarEvents = items.filter((item) => {
    if (item.category !== "calendar" || !item.startAt) return false;
    try {
      const start = parseISO(item.startAt);
      return isAfter(start, now) && isBefore(start, addHours(now, 2));
    } catch {
      return false;
    }
  });

  const nextEvent = upcomingCalendarEvents[0];
  const availableMinutes = nextEvent && nextEvent.startAt
    ? Math.max(15, differenceInMinutes(parseISO(nextEvent.startAt), now))
    : 90;

  // 3. Score candidates based on urgency, deadline proximity, priority, effort fit, and mode
  const scored = candidateTasks.map((item) => {
    let score = 0;
    let reasons: string[] = [];

    // Priority weighting
    if (item.priority === "critical") score += 30;
    else if (item.priority === "high") score += 20;
    else if (item.priority === "medium") score += 10;
    else score += 5;

    // Deadline & schedule proximity
    const isEventOrExam = item.category === "calendar" || item.category === "academic" || item.source === "google_calendar" || isExamItem(item);
    const targetDateStr = isEventOrExam ? (item.startAt || item.dueAt) : (item.dueAt || item.startAt);
    if (targetDateStr) {
      try {
        const dueDate = parseISO(targetDateStr);
        const hoursUntilDue = differenceInHours(dueDate, now);

        if (hoursUntilDue < 0) {
          score += 60;
          reasons.push("Overdue - requires immediate completion");
        } else if (hoursUntilDue <= 14) {
          score += 50;
          reasons.push("Scheduled for today");
        } else if (hoursUntilDue <= 36) {
          score += 35;
          reasons.push("Due tomorrow");
        } else if (hoursUntilDue <= 72) {
          score += 20;
          reasons.push("Due in the next 3 days");
        } else {
          // Distant future item (> 3 days away):
          score -= 25;
          reasons.push("Upcoming assessment");
        }
      } catch {
        // ignore date parse errors
      }
    }

    // Mode-specific boost
    if (mode === "exam") {
      if (item.category === "academic" || item.courseName) {
        score += 30;
        reasons.push("Prioritized for Exam Mode");
      }
    } else if (mode === "build") {
      if (item.category === "project" || item.projectId) {
        score += 30;
        reasons.push("Prioritized for Build Mode sprint");
      }
    }

    // Time fit weighting: Prefer tasks that fit inside available calendar window
    const estimated = item.estimatedMinutes || 45;
    if (estimated <= availableMinutes) {
      score += 15;
    } else {
      score -= 10;
    }

    // Craft clear, human-readable rationale
    let why = "";
    if (nextEvent) {
      why = `You have ${availableMinutes} minutes before "${nextEvent.title}". `;
    } else {
      why = `You have a clear focus window for the next ${availableMinutes} minutes. `;
    }

    if (item.priority === "critical" || item.priority === "high") {
      why += `This is your nearest high-priority deadline.`;
    } else if (reasons.length > 0) {
      why += reasons.join(". ") + ".";
    } else {
      why += `High impact to keep your weekly momentum progressing.`;
    }

    return {
      item,
      reason: why,
      availableMinutes,
      urgencyScore: score,
    };
  });

  // Sort descending by urgency score
  scored.sort((a, b) => b.urgencyScore - a.urgencyScore);

  return scored[0];
}
