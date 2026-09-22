import * as chrono from 'chrono-node';
import { ParsedSlotCommand } from './types';

// Triggers that signal free-slot booking intent
const SLOT_TRIGGERS = [
  /find\s+(?:a\s+)?free\s+time/i,
  /find\s+(?:a\s+)?free\s+slot/i,
  /find\s+(?:a\s+)?slot/i,
  /free\s+slot/i,
  /free\s+time/i,
  /schedule\s+(?:a\s+)?slot/i,
  /schedule\s+(?:a\s+)?task/i,
  /book\s+(?:a\s+)?slot/i,
  /book\s+(?:a\s+)?time/i,
  /^\/slot/i,
  /^\/free/i,
  /^\/schedule/i,
];

/**
 * Deterministically parses a natural language command into a structured slot booking request.
 * Uses chrono-node for zero-latency, local date extraction without LLMs.
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
    };
  }

  // Check if any slot trigger matches
  const isSlotCommand = SLOT_TRIGGERS.some((regex) => regex.test(trimmed));
  if (!isSlotCommand) {
    return {
      isSlotCommand: false,
      rawQuery: input,
      taskTitle: '',
      targetDate: null,
      targetDateFormatted: null,
      targetDateLabel: null,
      durationMinutes: 60,
    };
  }

  // 1. Extract duration if explicitly stated (e.g. "30 mins", "2 hours", "90 minutes")
  let durationMinutes = 60; // default to 60-minute window
  const durationMatch = trimmed.match(/(\d+)\s*(?:mins?|minutes?|hrs?|hours?)/i);
  if (durationMatch) {
    const val = parseInt(durationMatch[1], 10);
    if (/hrs?|hours?/i.test(durationMatch[0])) {
      durationMinutes = val * 60;
    } else {
      durationMinutes = val;
    }
  }

  // 2. Extract date using chrono-node
  const chronoResults = chrono.parse(trimmed, new Date(), { forwardDate: true });
  let targetDate: Date | null = null;
  let dateText = '';

  if (chronoResults.length > 0) {
    const firstResult = chronoResults[0];
    dateText = firstResult.text;
    targetDate = firstResult.start.date();
  } else {
    // Default to tomorrow if not specified
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    targetDate = tomorrow;
  }

  // Format dates
  const year = targetDate.getFullYear();
  const month = String(targetDate.getMonth() + 1).padStart(2, '0');
  const day = String(targetDate.getDate()).padStart(2, '0');
  const targetDateFormatted = `${year}-${month}-${day}`;

  const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const targetDateLabel = `${weekdayNames[targetDate.getDay()]}, ${monthNames[targetDate.getMonth()]} ${targetDate.getDate()}`;

  // 3. Extract clean task title
  let cleaned = trimmed;

  if (dateText) {
    cleaned = cleaned.replace(new RegExp(escapeRegex(dateText), 'i'), ' ');
  }

  if (durationMatch) {
    cleaned = cleaned.replace(new RegExp(escapeRegex(durationMatch[0]), 'i'), ' ');
  }

  const triggerPatterns = [
    /^\/slot\s*/i,
    /^\/free\s*/i,
    /^\/schedule\s*/i,
    /find\s+(?:a\s+)?free\s+time(?:\s+for)?/gi,
    /find\s+(?:a\s+)?free\s+slot(?:\s+for)?/gi,
    /find\s+(?:a\s+)?slot(?:\s+for)?/gi,
    /free\s+slot(?:\s+for)?/gi,
    /free\s+time(?:\s+for)?/gi,
    /book\s+(?:a\s+)?slot(?:\s+for)?/gi,
    /book\s+(?:a\s+)?time(?:\s+for)?/gi,
    /and\s+(?:assign\s+a\s+task\s+to|assign\s+task\s+to|schedule\s+a\s+task\s+to|schedule\s+task\s+to|schedule|assign)/gi,
    /(?:assign\s+a\s+task\s+to|assign\s+task\s+to|schedule\s+a\s+task\s+to|schedule\s+task\s+to|schedule|assign)/gi,
    /^\s*and\s+/gi,
    /\s+and\s*$/gi,
    /^\s*for\s+/gi,
    /^\s*to\s+/gi,
  ];

  for (const pat of triggerPatterns) {
    cleaned = cleaned.replace(pat, ' ');
  }

  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  cleaned = cleaned.replace(/^["']|["']$/g, '').trim();

  cleaned = cleaned.replace(/^(?:for|to|prep)\s+(?:prep\s+)?/i, (m) => {
    if (/prep/i.test(m)) return 'prep ';
    return '';
  }).trim();

  const taskTitle = cleaned || 'Scheduled Task';

  return {
    isSlotCommand: true,
    rawQuery: input,
    taskTitle,
    targetDate,
    targetDateFormatted,
    targetDateLabel,
    durationMinutes,
  };
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
