import { CalendarEvent, FreeSlotResult, UnifiedItem } from '../types';

export interface WorkHoursConfig {
  startHour: number; // default 9 (09:00)
  startMinute: number;
  endHour: number;   // default 16 (16:00 / 4:00 PM)
  endMinute: number;
}

// Working hours are strictly 9:00 AM to 4:00 PM (09:00 - 16:00)
export const DEFAULT_WORK_HOURS: WorkHoursConfig = {
  startHour: 9,
  startMinute: 0,
  endHour: 16,
  endMinute: 0,
};

/**
 * Deterministically finds all continuous free slots matching minDurationMinutes (default 5 mins)
 * within working hours (09:00 to 16:00) for a given date.
 * Captures all gaps, including small 5-minute or 10-minute slots.
 */
export function findAllFreeSlots(
  events: (CalendarEvent | UnifiedItem)[],
  targetDate: Date,
  minDurationMinutes: number = 5,
  taskTitle: string = 'Free Slot',
  workHours: WorkHoursConfig = DEFAULT_WORK_HOURS
): FreeSlotResult[] {
  const minDurationMs = Math.max(1, minDurationMinutes) * 60 * 1000;

  // 1. Establish the working window for targetDate (09:00 to 16:00)
  const windowStart = new Date(targetDate);
  windowStart.setHours(workHours.startHour, workHours.startMinute, 0, 0);

  const windowEnd = new Date(targetDate);
  windowEnd.setHours(workHours.endHour, workHours.endMinute, 0, 0);

  // If target date is today and now is within working hours, adjust start to current 5-min mark
  const now = new Date();
  const isToday =
    targetDate.getFullYear() === now.getFullYear() &&
    targetDate.getMonth() === now.getMonth() &&
    targetDate.getDate() === now.getDate();

  let effectiveStartMs = windowStart.getTime();
  if (isToday && now.getTime() > effectiveStartMs) {
    const coeff = 1000 * 60 * 5;
    effectiveStartMs = Math.ceil(now.getTime() / coeff) * coeff;
  }

  // If effective start is past the end of the work day (16:00), no remaining slots today
  if (effectiveStartMs >= windowEnd.getTime()) {
    return [];
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
      if (item.category === 'calendar' || item.source === 'google_calendar') {
        endIso = item.dueAt;
        startIso = new Date(new Date(item.dueAt).getTime() - 60 * 60 * 1000).toISOString();
      }
    }

    if (!startIso || !endIso) continue;

    const evStart = new Date(startIso).getTime();
    const evEnd = new Date(endIso).getTime();

    if (isNaN(evStart) || isNaN(evEnd) || evStart >= evEnd) continue;

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

  // 5. Deterministic interval-gap search collecting ALL free slots >= minDurationMs
  const freeSlots: FreeSlotResult[] = [];
  let candidateStart = effectiveStartMs;

  for (const busy of merged) {
    if (busy.start - candidateStart >= minDurationMs) {
      const durationMin = Math.round((busy.start - candidateStart) / (60 * 1000));
      freeSlots.push(formatSlotResult(candidateStart, busy.start, targetDate, taskTitle, durationMin));
    }
    if (busy.end > candidateStart) {
      candidateStart = busy.end;
    }
  }

  // Check final gap after all busy blocks up to 16:00 (4:00 PM)
  if (windowEnd.getTime() - candidateStart >= minDurationMs) {
    const durationMin = Math.round((windowEnd.getTime() - candidateStart) / (60 * 1000));
    freeSlots.push(formatSlotResult(candidateStart, windowEnd.getTime(), targetDate, taskTitle, durationMin));
  }

  return freeSlots;
}

/**
 * Deterministically finds the requested slot or the first continuous free slot matching durationMinutes
 * within working hours (09:00 to 16:00) for a given date.
 */
export function findFirstFreeSlot(
  events: (CalendarEvent | UnifiedItem)[],
  targetDate: Date,
  durationMinutes: number = 60,
  taskTitle: string = 'Scheduled Task',
  hasExplicitTime: boolean = false,
  workHours: WorkHoursConfig = DEFAULT_WORK_HOURS
): FreeSlotResult | null {
  const durationMs = durationMinutes * 60 * 1000;

  // 1. If the user specified an explicit time (e.g., "1 pm", "at 14:00")
  if (hasExplicitTime) {
    const startMs = targetDate.getTime();
    const endMs = startMs + durationMs;
    return formatSlotResult(startMs, endMs, targetDate, taskTitle, durationMinutes);
  }

  // 2. Find slots of at least durationMinutes within working hours (09:00 - 16:00)
  const allSlots = findAllFreeSlots(events, targetDate, durationMinutes, taskTitle, workHours);
  if (allSlots.length > 0) {
    const first = allSlots[0];
    const startMs = new Date(first.start).getTime();
    return formatSlotResult(startMs, startMs + durationMs, targetDate, taskTitle, durationMinutes);
  }

  return null;
}

function formatSlotResult(
  startMs: number,
  endMs: number,
  targetDate: Date,
  taskTitle: string,
  durationMinutes?: number
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

  const calculatedDuration = durationMinutes ?? Math.round((endMs - startMs) / (60 * 1000));
  const formattedTimeRange = `${formatTime(startDate)} – ${formatTime(endDate)}`;

  return {
    start: startDate.toISOString(),
    end: endDate.toISOString(),
    formattedDate,
    formattedTimeRange,
    taskTitle,
    durationMinutes: calculatedDuration,
  };
}
