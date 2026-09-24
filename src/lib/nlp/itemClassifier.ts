/**
 * NEXUS Autonomous Multi-Domain Smart Triage & Classifier Engine
 * 
 * Automatically analyzes incoming items from Google Calendar, Google Tasks, Notion,
 * GitHub, and Manual Capture, triaging them into precise life & academic domains:
 * 
 * 1. "exam": High-stakes evaluations (Internal Assessments, IA-1/2, CAT, Midterms, Vivas, Finals).
 * 2. "assignment": Academic submissions (Homework, Problem sets, Lab reports/records, essays).
 * 3. "class_lecture": Recurring timetable schedule (Lectures, lab periods, room numbers, theory).
 * 4. "personal": Everyday life (Chores, groceries, gym, health, calls, bills, travel, errands).
 * 5. "project_dev": Deep engineering (Coding, bug fixes, features, PRs, commits, architecture).
 * 6. "meeting": Group syncs (1-on-1s, club meetings, office hours, standups).
 */

import { Priority, SmartDomain } from "@/lib/types";

export type SemanticItemType = "class_lecture" | "assignment" | "task";

export interface ClassificationResult {
  type: SemanticItemType;
  confidence: number;
  reason: string;
  isActionableTask: boolean;
}

export interface SmartTriageResult {
  domain: SmartDomain;
  confidence: number;
  reason: string;
  suggestedAction: string;
  priority: Priority;
  estimatedMinutes: number;
  tags: string[];
  isActionableTask: boolean;
}

// 1. High-Stakes Exams, Internal Assessments (IA), Vivas, and Tests
const EXAM_PATTERNS = [
  /\b(?:ia|i\.a\.|cia|cat|internals?)(?:[-\s]*\d+)?\b/i, // IA, IA-1, IA 1, IA1, CIA, CAT-1, Internal Assessment
  /\b(?:internal\s+assessment|continuous\s+assessment|model\s+exam|board\s+exam)\b/i,
  /\b(?:exam|examination|midterm|midsem|mid\s+sem|endsem|end\s+sem|semester\s+exam|finals?)\b/i,
  /\b(?:lab\s+exam|practical\s+exam|lab\s+ia|viva|viva\s+voce|lab\s+internal|lab\s+assessment|practical\s+assessment)\b/i,
  /\b(?:quiz|test|unit\s+test|term\s+test)\b/i,
];

// 2. Academic Deliverables, Submissions, Homework, and Lab Records
const ASSIGNMENT_PATTERNS = [
  /\b(?:assignment|homework|hw|problem\s+set|pset|exercise)\b/i,
  /\b(?:lab\s+report|lab\s+record|observation\s+note|record\s+submission|manual\s+submission|logbook)\b/i,
  /\b(?:submission|submit|turn\s+in|hand\s+in|due\s+date|deadline)\b/i,
  /\b(?:essay|paper|thesis|dissertation|synopsis|abstract|case\s+study|literature\s+review)\b/i,
  /\b(?:project\s+milestone|presentation|slides\s+submission|code\s+submission)\b/i,
];

// 3. College Timetable Schedule, Routine Lectures, Lab Periods, and Room Codes
const CLASS_PATTERNS = [
  /\b(?:lecture|lab(?:\s+session|\s+period)?|tutorial|class|course|seminar|workshop|training|placement|theory|practical)\b/i,
  /\b(?:biology for engineers|bfe|python programming lab|pp lab|operating systems|computer architecture|data structures|dbms|oops|dsa|compiler|networks|software engineering)\b/i,
  /\b(?:room\s+\d+|hall\s+\d+|\d{2,3}\s*[a-z]\b)/i, // e.g. "114 B", "125B", "Room 302"
  /\b(?:prof\.|dr\.|faculty|instructor|hod|dean)\b/i,
  /\b(?:slot\s+[a-z\d]+|period\s+\d+)\b/i,
  /^[A-Z]{2,5}\s*\d{3,4}\b/, // e.g. "CS101", "MATH2020", "EE304"
];

// 4. Engineering, Development, and Coding Tasks
const PROJECT_DEV_PATTERNS = [
  /\b(?:build|code|implement|deploy|fix\s+bug|debug|refactor|pull\s+request|pr|commit|merge|pipeline|docker|vercel|github|api|database|backend|frontend|auth|endpoint|test\s+unit|ci\/cd|schema|repo|feature|bug|issue)\b/i,
  /\b(?:hackathon|prototype|wireframe|figma|mvp|release|v\d+\.\d+|npm|tailwind|next\.js|react)\b/i,
];

// 5. Personal Errands, Health, Chores, Finances, Family, and Habits
const PERSONAL_PATTERNS = [
  // Chores & Shopping
  /\b(?:clean|laundry|wash|cook|groceries|grocery|buy|purchase|shopping|order|pack|organize|trash|market|errand)\b/i,
  // Health & Fitness
  /\b(?:gym|workout|run|running|doctor|dentist|medicine|pill|appointment|checkup|therapy|yoga|walk|health|fitness)\b/i,
  // Finance & Admin
  /\b(?:pay\s+rent|rent|bill|recharge|electricity|fees|fee|bank|transfer|tax|renew|passport|visa|emi|investment|money)\b/i,
  // Social & Family
  /\b(?:call\s+mom|call\s+dad|call\s+parents|call|dinner\s+with|lunch\s+with|party|birthday|gift|family|friend|hangout)\b/i,
  // Travel & Commute
  /\b(?:flight|train|hotel|trip|travel|commute|cab|uber|ola|bus)\b/i,
  // Miscellaneous Personal
  /\b(?:watch|movie|haircut|salon|car\s+service|bike|repair)\b/i,
];

// 6. Group Syncs, Meetings, and Standups
const MEETING_PATTERNS = [
  /\b(?:sync|1:1|1-on-1|standup|weekly\s+sync|office\s+hours|club\s+meeting|interview|mentor|scrum|discussion|catch-up|sync-up|team\s+meeting)\b/i,
];

/**
 * Autonomous Smart Triage Engine:
 * Analyzes any item title, description, source, and timing, outputting a complete domain classification.
 */
export function smartTriageItem(input: {
  title: string;
  description?: string;
  location?: string;
  source?: string;
  category?: string;
  dueAt?: string;
  startAt?: string;
}): SmartTriageResult {
  const title = (input.title || "").trim();
  const desc = (input.description || "").trim();
  const location = (input.location || "").trim();
  const fullText = `${title} ${desc} ${location}`.trim();

  // 1. HIGHEST PRIORITY: Exams & Internal Assessments
  // Even if a course title contains "Lab" (e.g. "Python Programming Lab IA"), it is an Exam!
  for (const pattern of EXAM_PATTERNS) {
    if (pattern.test(title) || pattern.test(desc)) {
      return {
        domain: "exam",
        confidence: 0.98,
        reason: `Matched exam / assessment keyword (${pattern.source})`,
        suggestedAction: "Revise syllabus units, previous test papers, and formula sheets.",
        priority: "critical",
        estimatedMinutes: 90,
        tags: ["Exam", "Academic", "High Stakes"],
        isActionableTask: true,
      };
    }
  }

  // 2. Google Classroom or Coursework Submissions
  if (input.source === "google_classroom") {
    return {
      domain: "assignment",
      confidence: 0.96,
      reason: "Synced directly from Google Classroom coursework",
      suggestedAction: "Complete academic deliverable and attach submission.",
      priority: "high",
      estimatedMinutes: 60,
      tags: ["Assignment", "Google Classroom", "Academic"],
      isActionableTask: true,
    };
  }

  // 3. Academic Assignments, Homework, and Lab Reports
  for (const pattern of ASSIGNMENT_PATTERNS) {
    if (pattern.test(title) || pattern.test(desc)) {
      return {
        domain: "assignment",
        confidence: 0.94,
        reason: `Matched academic deliverable indicator (${pattern.source})`,
        suggestedAction: "Draft deliverable and submit before the cutoff.",
        priority: "high",
        estimatedMinutes: 60,
        tags: ["Assignment", "Academic", "Deliverable"],
        isActionableTask: true,
      };
    }
  }

  // 4. Engineering, Coding, GitHub, and Development Projects
  if (input.source === "github") {
    return {
      domain: "project_dev",
      confidence: 0.95,
      reason: "Synced from GitHub activity",
      suggestedAction: "Review code, resolve issues, or push commits.",
      priority: "high",
      estimatedMinutes: 45,
      tags: ["Dev", "GitHub", "Engineering"],
      isActionableTask: true,
    };
  }

  for (const pattern of PROJECT_DEV_PATTERNS) {
    if (pattern.test(title) || pattern.test(desc)) {
      return {
        domain: "project_dev",
        confidence: 0.91,
        reason: `Matched engineering/coding action pattern (${pattern.source})`,
        suggestedAction: "Launch focused deep work session to build or debug.",
        priority: "high",
        estimatedMinutes: 45,
        tags: ["Dev", "Engineering", "Deep Work"],
        isActionableTask: true,
      };
    }
  }

  // 5. Meetings, 1-on-1s, and Syncs
  for (const pattern of MEETING_PATTERNS) {
    if (pattern.test(title) || pattern.test(desc)) {
      return {
        domain: "meeting",
        confidence: 0.89,
        reason: `Matched meeting or sync indicator (${pattern.source})`,
        suggestedAction: "Join sync meeting and review agenda items.",
        priority: "medium",
        estimatedMinutes: 30,
        tags: ["Meeting", "Sync"],
        isActionableTask: false,
      };
    }
  }

  // 6. Timetable Classes, Lectures, and Lab Periods
  for (const pattern of CLASS_PATTERNS) {
    if (pattern.test(title) || pattern.test(fullText)) {
      return {
        domain: "class_lecture",
        confidence: 0.90,
        reason: `Matched timetable class/lecture pattern (${pattern.source})`,
        suggestedAction: "Attend scheduled lecture/lab session in assigned hall.",
        priority: "low",
        estimatedMinutes: 50,
        tags: ["Class", "Timetable", "Lecture"],
        isActionableTask: false,
      };
    }
  }

  // 7. Personal Errands, Health, Chores, Finances, and Habits
  for (const pattern of PERSONAL_PATTERNS) {
    if (pattern.test(title) || pattern.test(desc)) {
      return {
        domain: "personal",
        confidence: 0.92,
        reason: `Matched personal life/errand keyword (${pattern.source})`,
        suggestedAction: "Complete personal errand or habit.",
        priority: "medium",
        estimatedMinutes: 30,
        tags: ["Personal", "Life"],
        isActionableTask: true,
      };
    }
  }

  // 8. Source-based heuristics: Google Calendar events without action verbs
  if (input.source === "google_calendar" || input.category === "calendar") {
    // If it mentions no personal action verbs, it's likely a calendar routine event
    return {
      domain: "class_lecture",
      confidence: 0.80,
      reason: "Calendar scheduled event without actionable task verb",
      suggestedAction: "Check calendar entry for timing and location.",
      priority: "low",
      estimatedMinutes: 60,
      tags: ["Calendar"],
      isActionableTask: false,
    };
  }

  // Default: Actionable Personal Task
  return {
    domain: "personal",
    confidence: 0.75,
    reason: "Standard actionable todo item",
    suggestedAction: "Execute task in your next free block.",
    priority: "medium",
    estimatedMinutes: 30,
    tags: ["Personal"],
    isActionableTask: true,
  };
}

/**
 * Backward-compatible classifier for legacy components.
 */
export function classifyItemNLP(input: {
  title: string;
  description?: string;
  location?: string;
  source?: string;
  category?: string;
}): ClassificationResult {
  const triage = smartTriageItem(input);

  if (triage.domain === "class_lecture" || triage.domain === "meeting") {
    return {
      type: "class_lecture",
      confidence: triage.confidence,
      reason: triage.reason,
      isActionableTask: triage.isActionableTask,
    };
  }

  if (triage.domain === "exam" || triage.domain === "assignment") {
    return {
      type: "assignment",
      confidence: triage.confidence,
      reason: triage.reason,
      isActionableTask: true,
    };
  }

  return {
    type: "task",
    confidence: triage.confidence,
    reason: triage.reason,
    isActionableTask: true,
  };
}

/**
 * Filter utility: returns true only if the item is an actionable task or assignment (NOT a passive class lecture).
 */
export function isActionableTaskOrAssignment(item: {
  title: string;
  description?: string;
  metadata?: { location?: string };
  source?: string;
  category?: string;
}): boolean {
  const triage = smartTriageItem({
    title: item.title,
    description: item.description,
    location: item.metadata?.location,
    source: item.source,
    category: item.category,
  });

  return triage.isActionableTask;
}

/**
 * Checks if an item represents an Exam, Test, Quiz, or Internal Assessment (IA).
 */
export function isExamItem(item: {
  title: string;
  description?: string;
}): boolean {
  const title = (item.title || "").trim();
  const desc = (item.description || "").trim();
  return EXAM_PATTERNS.some((pattern) => pattern.test(title) || pattern.test(desc));
}

/**
 * Intelligent Course Inference:
 * Extracts or infers standardized course names and codes from titles, descriptions, or existing fields.
 */
export function inferCourseFromItem(item: {
  title: string;
  description?: string;
  courseName?: string;
}): string | undefined {
  if (item.courseName?.trim()) return item.courseName.trim();
  const text = `${item.title} ${item.description || ""}`.toLowerCase();

  if (/\b(?:os|operating\s+systems?)\b/i.test(text)) return "Operating Systems (OS)";
  if (/\b(?:coa|computer\s+org(?:anization)?|computer\s+architecture)\b/i.test(text)) return "Computer Org & Architecture (COA)";
  if (/\b(?:python|py\b|python\s+programming)\b/i.test(text)) return "Python Programming";
  if (/\b(?:cn|networks?|computer\s+networks?)\b/i.test(text)) return "Computer Networks (CN)";
  if (/\b(?:dbms|database|sql)\b/i.test(text)) return "Database Management Systems (DBMS)";
  if (/\b(?:dsa|data\s+structures?|algorithms?)\b/i.test(text)) return "Data Structures & Algorithms (DSA)";
  if (/\b(?:bfe|biology\s+for\s+engineers?)\b/i.test(text)) return "Biology for Engineers (BFE)";
  if (/\b(?:se|software\s+eng(?:ineering)?)\b/i.test(text)) return "Software Engineering (SE)";
  if (/\b(?:math|calculus|discrete\s+math)\b/i.test(text)) return "Engineering Mathematics";

  return undefined;
}

/**
 * Categorizes the type of examination (IA, Semester, Practical, Viva, Quiz).
 */
export function getExamTypeLabel(title: string): string {
  const lower = title.toLowerCase();
  if (/\b(?:ia|cia|cat|internals?)\b/i.test(lower)) return "Internal Assessment (IA)";
  if (/\b(?:viva|oral)\b/i.test(lower)) return "Viva Voce Examination";
  if (/\b(?:practical|lab)\b/i.test(lower)) return "Practical / Lab Exam";
  if (/\b(?:semester|endsem|finals?)\b/i.test(lower)) return "Final Semester Exam";
  if (/\b(?:quiz|test)\b/i.test(lower)) return "Course Quiz / Test";
  return "Academic Examination";
}

/**
 * Helper to get the SmartDomain of any item.
 */
export function getSmartDomain(item: {
  title: string;
  description?: string;
  source?: string;
  category?: string;
  metadata?: Record<string, any>;
}): SmartDomain {
  return smartTriageItem({
    title: item.title,
    description: item.description,
    location: item.metadata?.location,
    source: item.source,
    category: item.category,
  }).domain;
}

/**
 * Visual styling configuration for Smart Domain badges.
 */
export function getDomainBadgeProps(domain: SmartDomain): {
  label: string;
  shortLabel: string;
  colorClass: string;
  borderClass: string;
  bgClass: string;
  badgeVariant: "destructive" | "warning" | "default" | "secondary" | "outline";
} {
  switch (domain) {
    case "exam":
      return {
        label: "Exam / Assessment",
        shortLabel: "EXAM",
        colorClass: "text-rose-300",
        borderClass: "border-rose-500/40",
        bgClass: "bg-rose-500/20",
        badgeVariant: "destructive",
      };
    case "assignment":
      return {
        label: "Assignment & Submission",
        shortLabel: "ASSIGNMENT",
        colorClass: "text-blue-300",
        borderClass: "border-blue-500/40",
        bgClass: "bg-blue-500/20",
        badgeVariant: "default",
      };
    case "class_lecture":
      return {
        label: "Class & Timetable",
        shortLabel: "CLASS",
        colorClass: "text-purple-300",
        borderClass: "border-purple-500/40",
        bgClass: "bg-purple-500/20",
        badgeVariant: "secondary",
      };
    case "project_dev":
      return {
        label: "Project & Dev",
        shortLabel: "PROJECT",
        colorClass: "text-amber-300",
        borderClass: "border-amber-500/40",
        bgClass: "bg-amber-500/20",
        badgeVariant: "warning",
      };
    case "personal":
      return {
        label: "Personal Life",
        shortLabel: "PERSONAL",
        colorClass: "text-emerald-300",
        borderClass: "border-emerald-500/40",
        bgClass: "bg-emerald-500/20",
        badgeVariant: "outline",
      };
    case "meeting":
      return {
        label: "Meeting / Sync",
        shortLabel: "MEETING",
        colorClass: "text-cyan-300",
        borderClass: "border-cyan-500/40",
        bgClass: "bg-cyan-500/20",
        badgeVariant: "secondary",
      };
  }
}
