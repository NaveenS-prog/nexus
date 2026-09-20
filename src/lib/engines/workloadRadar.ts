import { UnifiedItem, WorkloadDay } from "../types";
import { addDays, format, isSameDay, parseISO } from "date-fns";

export function compute14DayWorkload(items: UnifiedItem[], startDate: Date = new Date()): WorkloadDay[] {
  const days: WorkloadDay[] = [];

  for (let i = 0; i < 14; i++) {
    const currentDate = addDays(startDate, i);
    const dateStr = format(currentDate, "yyyy-MM-dd");
    const dayLabel = format(currentDate, "EEE");
    const dayNumber = parseInt(format(currentDate, "d"), 10);
    const formattedDate = format(currentDate, "EEE, MMM d");
    const isToday = i === 0;

    // Filter items relevant to this day:
    // 1. Due on this day
    // 2. Or scheduled calendar events on this day
    const dayItems = items.filter((item) => {
      const targetDateStr = item.dueAt || item.startAt;
      if (!targetDateStr) return false;
      try {
        const itemDate = parseISO(targetDateStr);
        return isSameDay(itemDate, currentDate);
      } catch {
        return false;
      }
    });

    const tasksCount = dayItems.filter((item) => item.status !== "completed").length;
    const deadlinesCount = dayItems.filter(
      (item) => item.priority === "critical" || (item.category === "academic" && item.dueAt)
    ).length;

    const calendarMinutes = dayItems
      .filter((item) => item.category === "calendar")
      .reduce((sum, item) => sum + (item.estimatedMinutes || 60), 0);

    const taskMinutes = dayItems
      .filter((item) => item.category !== "calendar" && item.status !== "completed")
      .reduce((sum, item) => sum + (item.estimatedMinutes || 45), 0);

    // Compute workload score (0 - 100 index)
    // Formula:
    // (tasks * 6) + (deadlines * 15) + (total hours * 10)
    const totalMinutes = calendarMinutes + taskMinutes;
    const rawScore = (tasksCount * 6) + (deadlinesCount * 15) + ((totalMinutes / 60) * 10);
    const totalScore = Math.min(100, Math.round(rawScore));

    const isCrunchDay = totalScore >= 65 || deadlinesCount >= 2 || tasksCount >= 5;

    days.push({
      date: dateStr,
      dayLabel,
      dayNumber,
      formattedDate,
      totalScore,
      tasksCount,
      deadlinesCount,
      calendarMinutes: totalMinutes,
      items: dayItems,
      isToday,
      isCrunchDay,
    });
  }

  return days;
}

export function getPeakWorkloadDay(days: WorkloadDay[]): WorkloadDay | null {
  if (!days || days.length === 0) return null;
  return [...days].sort((a, b) => b.totalScore - a.totalScore)[0];
}
