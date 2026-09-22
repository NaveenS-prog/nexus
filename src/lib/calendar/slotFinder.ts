import { CalendarEvent, FreeSlotResult, UnifiedItem } from '../types';

export interface WorkHoursConfig {
  startHour: number; // default 9 (09:00)
  startMinute: number;
  endHour: number;   // default 18 (18:00)
  endMinute: number;
}

export const DEFAULT_WORK_HOURS: WorkHoursConfig = {
  startHour: 9,
  startMinute: 0,
  endHour: 18,
  endMinute: 0,
};

/**
 * Deterministically finds the first continuous free slot matching durationMinutes
 * within working hours (09:00 to 18:00) for a given date.
 */
export function findFirstFreeSlot(
  events: (CalendarEvent | UnifiedItem)[],
  targetDate: Date,
  durationMinutes: number = 60,
  taskTitle: string = 'Scheduled Task',
  workHours: WorkHoursConfig = DEFAULT_WORK_HOURS
): FreeSlotResult | null {
  const durationMs = durationMinutes * 60 * 1000;

  // 1. Establish the working window for targetDate
  const windowStart = new Date(targetDate);
  windowStart.setHours(workHours.startHour, workHours.startMinute, 0, 0);

  const windowEnd = new Date(targetDate);
  windowEnd.setHours(workHours.endHour, workHours.endMinute, 0, 0);

  // If target date is today and now is past 9:00 AM, adjust search start to next 15-min mark
  const now = new Date();
  const isToday =
    targetDate.getFullYear() === now.getFullYear() &&
    targetDate.getMonth() === now.getMonth() &&
    targetDate.getDate() === now.getDate();

  let effectiveStartMs = windowStart.getTime();
  if (isToday && now.getTime() > effectiveStartMs) {
    const coeff = 1000 * 60 * 15;
    effectiveStartMs = Math.ceil((now.getTime() + 15 * 60 * 1000) / coeff) * coeff;
  }

  // If effective start is past the end of the work day, no slot today
  if (effectiveStartMs + durationMs > windowEnd.getTime()) {
    return null;
  }

  // 2. Filter events that fall on the target date and overlap with the working window
  interface BusyInterval {
    start: number;
    end: number;
  }

  const busyIntervals: BusyInterval[] = [];

  for (const item of events) {
    let startIso: string | undefined;
    let endIso: string | undefined;

    if ('startTime' in item && typeof item.startTime === 'string') {
      startIso = item.startTime;
      endIso = item.endTime;
    } else if ('startAt' in item && typeof item.startAt === 'string') {
      startIso = item.startAt;
      endIso = item.dueAt || new Date(new Date(item.startAt).getTime() + 60 * 60 * 1000).toISOString();
    } else if ('dueAt' in item && typeof item.dueAt === 'string') {
      endIso = item.dueAt;
      startIso = new Date(new Date(item.dueAt).getTime() - 60 * 60 * 1000).toISOString();
    }

    if (!startIso || !endIso) continue;

    const evStart = new Date(startIso).getTime();
    const evEnd = new Date(endIso).getTime();

    if (isNaN(evStart) || isNaN(evEnd) || evStart >= evEnd) continue;

    // Check overlap with working window [effectiveStartMs, windowEnd]
    const clampedStart = Math.max(evStart, effectiveStartMs);
    const clampedEnd = Math.min(evEnd, windowEnd.getTime());

    if (clampedStart < clampedEnd) {
      busyIntervals.push({ start: clampedStart, end: clampedEnd });
    }
  }

  // 3. Sort busy intervals by start time
  busyIntervals.sort((a, b) => a.start - b.start);

  // 4. Merge overlapping or adjacent busy intervals
  const merged: BusyInterval[] = [];
  for (const interval of busyIntervals) {
    if (merged.length === 0) {
      merged.push({ ...interval });
    } else {
      const prev = merged[merged.length - 1];
      if (interval.start <= prev.end) {
        prev.end = Math.max(prev.end, interval.end);
      } else {
        merged.push({ ...interval });
      }
    }
  }

  // 5. Deterministic interval-gap search
  let candidateStart = effectiveStartMs;

  for (const busy of merged) {
    if (busy.start - candidateStart >= durationMs) {
      return formatSlotResult(candidateStart, candidateStart + durationMs, targetDate, taskTitle);
    }
    if (busy.end > candidateStart) {
      candidateStart = busy.end;
    }
  }

  // Check final gap after all busy blocks up to windowEnd
  if (windowEnd.getTime() - candidateStart >= durationMs) {
    return formatSlotResult(candidateStart, candidateStart + durationMs, targetDate, taskTitle);
  }

  return null;
}

function formatSlotResult(
  startMs: number,
  endMs: number,
  targetDate: Date,
  taskTitle: string
): FreeSlotResult {
  const startDate = new Date(startMs);
  const endDate = new Date(endMs);

  const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const formattedDate = `${weekdayNames[targetDate.getDay()]}, ${monthNames[targetDate.getMonth()]} ${targetDate.getDate()}`;
  
  const formatTime = (d: Date) => {
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours}:${minutes} ${ampm}`;
  };

  const formattedTimeRange = `${formatTime(startDate)} – ${formatTime(endDate)}`;

  return {
    start: startDate.toISOString(),
    end: endDate.toISOString(),
    formattedDate,
    formattedTimeRange,
    taskTitle,
  };
}
