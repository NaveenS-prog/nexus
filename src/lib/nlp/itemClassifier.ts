/**
 * NEXUS Natural Language Item Classifier
 * Intelligently differentiates between:
 * 1. "class_lecture": Recurring or scheduled lectures, labs, college training sessions, and timetable blocks.
 * 2. "assignment": Academic deliverables, submissions, homework, lab reports, exams, and quizzes.
 * 3. "task": Actionable personal/dev todos, project tasks, chores, and communications.
 */

export type SemanticItemType = "class_lecture" | "assignment" | "task";

export interface ClassificationResult {
  type: SemanticItemType;
  confidence: number; // 0 to 1
  reason: string;
  isActionableTask: boolean;
}

// Specific Indian & Global College Exam & Internal Assessment patterns
const EXAM_PATTERNS = [
  /\b(?:ia|i\.a\.|cia|cat|internals?)(?:[-\s]*\d+)?\b/i, // IA, IA-1, IA 1, IA1, CIA, CAT-1, Internal Assessment
  /\b(?:internal\s+assessment|continuous\s+assessment)\b/i,
  /\b(?:exam|examination|test|quiz|midterm|midsem|mid\s+sem|endsem|end\s+sem|semester\s+exam|model\s+exam|board\s+exam)\b/i,
  /\b(?:lab\s+exam|practical\s+exam|lab\s+ia|viva|viva\s+voce|lab\s+internal|lab\s+assessment)\b/i,
];

// Keywords identifying scheduled classes, lab sessions, and academic timetable lectures
const CLASS_PATTERNS = [
  /\b(?:lecture|lab(?:\s+session|\s+period)?|tutorial|class|course|seminar|workshop|training|placement|theory|practical)\b/i,
  /\b(?:biology for engineers|bfe|python programming lab|pp lab|operating systems|computer architecture|data structures|dbms|oops)\b/i,
  /\b(?:room\s+\d+|hall\s+\d+|\d{2,3}\s*[a-z]\b)/i, // e.g. "114 B", "125B", "Room 302"
  /\b(?:prof\.|dr\.|faculty|instructor)\b/i,
  /\b(?:slot\s+[a-z\d]+|period\s+\d+)\b/i,
  /^[A-Z]{2,5}\s*\d{3,4}\b/, // e.g. "CS101", "MATH2020", "EE304"
];

// Keywords identifying assignments, homework, and academic deliverables
const ASSIGNMENT_PATTERNS = [
  /\b(?:assignment|homework|hw|problem\s+set|pset|exercise)\b/i,
  /\b(?:lab\s+report|lab\s+record|observation\s+note|record\s+submission)\b/i,
  /\b(?:submission|submit|turn\s+in|hand\s+in|due\s+date|deadline)\b/i,
  /\b(?:essay|paper|thesis|dissertation|synopsis|abstract|case\s+study)\b/i,
  /\b(?:project\s+milestone|presentation|slides\s+submission)\b/i,
];

// Action verbs indicating a personal or development task
const TASK_ACTION_VERBS = [
  /^(?:build|fix|write|implement|review|create|update|refactor|deploy|debug|test|email|call|buy|read|clean|finish|complete|send|prepare|setup|install)\b/i,
  /\b(?:feature|bug|issue|pull request|pr|repo|commit|pipeline)\b/i,
];

/**
 * Classifies an item based on its title, description, location, and metadata.
 */
export function classifyItemNLP(input: {
  title: string;
  description?: string;
  location?: string;
  source?: string;
  category?: string;
}): ClassificationResult {
  const title = (input.title || "").trim();
  const desc = (input.description || "").trim();
  const location = (input.location || "").trim();
  const fullText = `${title} ${desc} ${location}`;

  // 1. HIGHEST PRIORITY: Check for IA, Exams, and Internal Assessments
  // Even if title contains "Lab" or "Python Programming Lab", an IA/Exam is an assessment!
  for (const pattern of EXAM_PATTERNS) {
    if (pattern.test(title) || pattern.test(desc)) {
      return {
        type: "assignment",
        confidence: 0.98,
        reason: `Matched exam / internal assessment indicator (${pattern.source})`,
        isActionableTask: true,
      };
    }
  }

  // 2. Google Classroom assignments are natively assignments
  if (input.source === "google_classroom" || input.category === "academic") {
    return {
      type: "assignment",
      confidence: 0.95,
      reason: "Sourced from Google Classroom / Coursework integration",
      isActionableTask: true,
    };
  }

  // 3. Check for explicit assignment / deliverable signals
  for (const pattern of ASSIGNMENT_PATTERNS) {
    if (pattern.test(title) || pattern.test(desc)) {
      return {
        type: "assignment",
        confidence: 0.92,
        reason: `Matched academic deliverable indicator (${pattern.source})`,
        isActionableTask: true,
      };
    }
  }

  // 3. Check for class / lecture / training signals
  for (const pattern of CLASS_PATTERNS) {
    if (pattern.test(title) || pattern.test(fullText)) {
      return {
        type: "class_lecture",
        confidence: 0.88,
        reason: `Matched timetable class/lecture pattern (${pattern.source})`,
        isActionableTask: false,
      };
    }
  }

  // 4. Source heuristics: Google Calendar events without action verbs or assignment keywords
  if (input.source === "google_calendar" || input.category === "calendar") {
    // Check if it starts with an imperative action verb (e.g. "Submit report")
    const startsWithVerb = TASK_ACTION_VERBS[0].test(title);
    if (!startsWithVerb) {
      return {
        type: "class_lecture",
        confidence: 0.82,
        reason: "Calendar scheduled event without actionable task verb",
        isActionableTask: false,
      };
    }
  }

  // 5. Check for task action verbs
  for (const pattern of TASK_ACTION_VERBS) {
    if (pattern.test(title)) {
      return {
        type: "task",
        confidence: 0.85,
        reason: `Matched imperative task action verb (${pattern.source})`,
        isActionableTask: true,
      };
    }
  }

  // Default: treat as personal actionable task
  return {
    type: "task",
    confidence: 0.7,
    reason: "Standard actionable item",
    isActionableTask: true,
  };
}

/**
 * Filter utility: returns true only if the item is an actionable task or assignment (NOT a class lecture).
 */
export function isActionableTaskOrAssignment(item: {
  title: string;
  description?: string;
  metadata?: { location?: string };
  source?: string;
  category?: string;
}): boolean {
  const result = classifyItemNLP({
    title: item.title,
    description: item.description,
    location: item.metadata?.location,
    source: item.source,
    category: item.category,
  });

  return result.isActionableTask;
}

/**
 * Utility: Checks if an item represents an Exam, Test, Quiz, or Internal Assessment (IA).
 */
export function isExamItem(item: {
  title: string;
  description?: string;
}): boolean {
  const title = (item.title || "").trim();
  const desc = (item.description || "").trim();
  return EXAM_PATTERNS.some((pattern) => pattern.test(title) || pattern.test(desc));
}
