import * as chrono from 'chrono-node';
import { ParsedSlotCommand } from './types';

// Triggers that signal task assignment or free-slot booking intent
const TRIGGER_REGEX = /^(?:assign\s+task|assign|schedule\s+task|schedule|add\s+task|create\s+task|find\s+(?:a\s+)?free\s+time|find\s+(?:a\s+)?free\s+slot|find\s+(?:a\s+)?slot|free\s+slot|free\s+time|book\s+slot|book\s+time|task|\/slot|\/schedule|\/task)/i;

/**
 * Deterministically parses a natural language command into a structured task/slot booking request.
 * Uses chrono-node for zero-latency, local date & time extraction without LLMs.
 */
export function parseSlotCommand(input: string): ParsedSlotCommand {
  const trimmed = input.trim();
  if (!trimmed) {
    return {
      isSlotCommand: false,
      rawQuery: input,
      taskTitle: '',
      targetDate: null,
      targetDateFormatted: null,
      targetDateLabel: null,
      durationMinutes: 60,
      hasExplicitTime: false,
    };
  }

  const hasTrigger = TRIGGER_REGEX.test(trimmed);
  const chronoResults = chrono.parse(trimmed, new Date(), { forwardDate: true });

  // If neither an action trigger nor a date/time was found, not a slot/task command
  if (!hasTrigger && chronoResults.length === 0) {
    return {
      isSlotCommand: false,
      rawQuery: input,
      taskTitle: '',
      targetDate: null,
      targetDateFormatted: null,
      targetDateLabel: null,
      durationMinutes: 60,
      hasExplicitTime: false,
    };
  }

  // 1. Extract duration if stated (e.g. "30 mins", "2 hours")
  let durationMinutes = 60;
  const durationMatch = trimmed.match(/(\d+)\s*(?:mins?|minutes?|hrs?|hours?)/i);
  if (durationMatch) {
    const val = parseInt(durationMatch[1], 10);
    durationMinutes = /hrs?|hours?/i.test(durationMatch[0]) ? val * 60 : val;
  }

  // 2. Extract date & time
  let targetDate: Date | null = null;
  let hasExplicitTime = false;

  if (chronoResults.length > 0) {
    // Prefer the result that specified an explicit hour/time
    const withCertainHour = chronoResults.find((r) => r.start.isCertain('hour'));
    const chosen = withCertainHour || chronoResults[0];
    targetDate = chosen.start.date();
    hasExplicitTime = chosen.start.isCertain('hour');
  } else {
    // Default to tomorrow at 10:00 AM
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    targetDate = tomorrow;
  }

  // 3. Clean Task Title
  let cleaned = trimmed;
  for (const r of chronoResults) {
    cleaned = cleaned.replace(r.text, ' ');
  }
  if (durationMatch) {
    cleaned = cleaned.replace(durationMatch[0], ' ');
  }

  // Remove trigger prefix words
  cleaned = cleaned.replace(TRIGGER_REGEX, ' ');

  // Clean dangling connectors & prepositions
  cleaned = cleaned.replace(/\s+(?:on|at|by|for|to|due)\s*$/gi, ' ');
  cleaned = cleaned.replace(/^\s*(?:on|at|by|for|to|due)\s+/gi, ' ');
  cleaned = cleaned.replace(/\s+and\s+(?:assign|schedule|create|add)?\s+/gi, ' ');
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  cleaned = cleaned.replace(/^["']|["']$/g, '').trim();

  // If still leading with "for " or "to "
  cleaned = cleaned.replace(/^(?:for|to|prep)\s+(?:prep\s+)?/i, (m) => {
    if (/prep/i.test(m)) return 'prep ';
    return '';
  }).trim();

  const taskTitle = cleaned || 'Scheduled Task';

  const year = targetDate.getFullYear();
  const month = String(targetDate.getMonth() + 1).padStart(2, '0');
  const day = String(targetDate.getDate()).padStart(2, '0');
  const targetDateFormatted = `${year}-${month}-${day}`;

  const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const targetDateLabel = `${weekdayNames[targetDate.getDay()]}, ${monthNames[targetDate.getMonth()]} ${targetDate.getDate()}`;

  return {
    isSlotCommand: true,
    rawQuery: input,
    taskTitle,
    targetDate,
    targetDateFormatted,
    targetDateLabel,
    durationMinutes,
    hasExplicitTime,
  };
}
