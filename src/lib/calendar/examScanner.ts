import { UnifiedItem } from "@/lib/types";
import { isExamItem, smartTriageItem } from "@/lib/nlp/itemClassifier";

/**
 * Normalizes title for bulletproof deduplication:
 * strips prefixes (reminder:, exam:), non-alphanumeric chars, and whitespace.
 */
export function normalizeExamOrTaskTitle(title: string): string {
  return (title || "")
    .toLowerCase()
    .replace(/^reminder:\s*/i, "")
    .replace(/^exam:\s*/i, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

/**
 * Autonomous Calendar Event Exam Scanner & Deduplication Engine:
 * 1. Scans every calendar event, identifying high-stakes exams, IAs, CATs, and tests.
 * 2. Enriches the Google Calendar event in-place (smartDomain: "exam", category: "academic", priority: "critical").
 * 3. STRICTLY PREVENTS & PURGES DUPLICATES:
 *    - Deletes any auto-spawned duplicate tasks (`task-exam-reminder-*`).
 *    - Deletes any nexus task that duplicates a Google Calendar event (preserving the Google Calendar item).
 *    - Deduplicates identical entries by title and date.
 */
export function scanAndDeduplicateExamItems(items: UnifiedItem[]): {
  items: UnifiedItem[];
  createdCount: number;
} {
  // 1. Purge any auto-spawned duplicate reminder tasks and legacy fallback items
  const rawCleaned = items.filter((item) => {
    if (item.id?.startsWith("task-exam-reminder-")) return false;
    if (item.metadata?.isExamReminder === true) return false;
    if (item.metadata?.linkedEventId) return false;
    if (item.id?.startsWith("evt-")) return false; // Purge all legacy hardcoded fallback events
    return true;
  });

  // 2. Identify all Google Calendar events by normalized title & date
  const gcalTitles = new Set<string>();
  const gcalExamTitles = new Set<string>();

  rawCleaned.forEach((item) => {
    if (item.source === "google_calendar" || item.category === "calendar") {
      const normTitle = normalizeExamOrTaskTitle(item.title);
      if (normTitle) {
        gcalTitles.add(normTitle);
        if (isExamItem(item)) {
          gcalExamTitles.add(normTitle);
        }
      }
    }
  });

  // 3. Filter out any nexus/custom tasks that duplicate Google Calendar events
  // Prioritize live Google Calendar API items (gcal-*)
  const sortedItems = [...rawCleaned].sort((a, b) => {
    const aIsLive = a.id?.startsWith("gcal-") ? 2 : (a.source === "google_calendar" ? 1 : 0);
    const bIsLive = b.id?.startsWith("gcal-") ? 2 : (b.source === "google_calendar" ? 1 : 0);
    return bIsLive - aIsLive; // Real Google API items processed first!
  });

  const deduplicated: UnifiedItem[] = [];
  const seenGcalSignatures = new Set<string>();
  const seenNexusSignatures = new Set<string>();

  for (const item of sortedItems) {
    const normTitle = normalizeExamOrTaskTitle(item.title);
    const dateKey = (item.startAt || item.dueAt || "").slice(0, 10);
    const isGcal = item.source === "google_calendar" || item.category === "calendar";
    const isExam = isExamItem(item);

    // If this item is from nexus/google_tasks, but an exam or event with the same title
    // already exists in Google Calendar:
    // DELETE the duplicate from nexus task, keep the Google Calendar event!
    if (!isGcal) {
      if (gcalExamTitles.has(normTitle) || (dateKey && gcalTitles.has(normTitle))) {
        // Discard duplicate nexus task!
        continue;
      }

      // Deduplicate identical nexus tasks among themselves
      const nexusSig = `${normTitle}___${dateKey}`;
      if (seenNexusSignatures.has(nexusSig)) {
        continue;
      }
      seenNexusSignatures.add(nexusSig);
      deduplicated.push(item);
      continue;
    }

    // For Google Calendar items:
    // Ensure we keep only a single entry per exam or per title+date
    const gcalSig = isExam ? normTitle : `${normTitle}___${dateKey}`;
    if (seenGcalSignatures.has(gcalSig)) {
      continue;
    }
    seenGcalSignatures.add(gcalSig);

    // Enrich exam in-place
    if (isExam) {
      const triage = smartTriageItem({
        title: item.title,
        description: item.description,
        source: item.source,
        category: item.category,
        startAt: item.startAt,
        dueAt: item.dueAt,
      });

      const mergedTags = Array.from(
        new Set([...(item.tags || []), ...triage.tags, "Exam", "Academic"])
      );

      deduplicated.push({
        ...item,
        category: "academic",
        smartDomain: "exam",
        priority: "critical",
        tags: mergedTags,
      });
    } else {
      deduplicated.push(item);
    }
  }

  return {
    items: deduplicated,
    createdCount: 0,
  };
}

// Backwards-compatibility alias
export const scanAndAutoAssignExamTasks = scanAndDeduplicateExamItems;
