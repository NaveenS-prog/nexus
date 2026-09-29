// ==============================================================================
// NEXUS Academic Intelligence Layer - Semantic Item Classifier
// ==============================================================================

import { AcademicItemType, AcademicPriority } from "@/lib/types/academic";

export interface ClassificationResult {
  type: AcademicItemType;
  confidence: number;
  reason: string;
  suggestedAction: "CREATE_TASK" | "ORGANIZE_TO_DRIVE" | "START_WORKSPACE" | "POST_ANNOUNCEMENT" | "CALENDAR_REMINDER";
  priority: AcademicPriority;
  suggestedEstimatedMinutes?: number;
}

export function classifyAcademicItem(params: {
  title: string;
  description?: string;
  instructions?: string;
  dueAt?: string | null;
  attachments?: Array<{ name: string; url?: string; mimeType?: string }>;
  rawCategory?: string;
}): ClassificationResult {
  const title = (params.title || "").trim().toLowerCase();
  const desc = ((params.description || "") + " " + (params.instructions || "")).toLowerCase();
  const fullText = `${title} ${desc}`;
  const hasDueDate = Boolean(params.dueAt && params.dueAt.trim().length > 0);
  const attachments = params.attachments || [];

  // Determine attachment characteristics
  const hasSlideAttachments = attachments.some((a) => {
    const name = a.name.toLowerCase();
    return (
      name.endsWith(".pptx") ||
      name.endsWith(".ppt") ||
      name.includes("slide") ||
      name.includes("deck") ||
      name.includes("lecture")
    );
  });

  const hasCodeAttachments = attachments.some((a) => {
    const name = a.name.toLowerCase();
    return (
      name.endsWith(".py") ||
      name.endsWith(".java") ||
      name.endsWith(".c") ||
      name.endsWith(".cpp") ||
      name.endsWith(".js") ||
      name.endsWith(".ts") ||
      name.endsWith(".zip") ||
      name.endsWith(".tar.gz")
    );
  });

  // Actionable submission verbs
  const hasSubmissionVerbs =
    /\b(submit|upload|hand in|turn in|due by|submission deadline|points|rubric|grading criteria)\b/i.test(
      fullText
    );

  // 1. SCHEDULE CHANGES
  if (
    /\b(class cancelled|rescheduled|room change|no lecture|time change|postponed|makeup class)\b/i.test(
      fullText
    )
  ) {
    return {
      type: "SCHEDULE_CHANGE",
      confidence: 0.95,
      reason: "Detected class scheduling change or room rescheduling notification",
      suggestedAction: "CALENDAR_REMINDER",
      priority: "high",
    };
  }

  // 2. EXAMINATIONS / TESTS / QUIZZES
  if (
    /\b(midterm|final exam|quiz|examination|test #?[0-9]|pop quiz|assessment exam|viva)\b/i.test(
      title
    ) ||
    (/\b(exam|midterm|final exam)\b/i.test(desc) && hasDueDate)
  ) {
    return {
      type: "EXAM",
      confidence: 0.94,
      reason: "Identified examination, quiz, or formal assessment with strict timeline",
      suggestedAction: "CALENDAR_REMINDER",
      priority: "critical",
      suggestedEstimatedMinutes: 180,
    };
  }

  // 3. LAB SESSIONS & PRACTICAL EXPERIMENTS
  if (
    /\b(lab|laboratory|experiment|practicum|hands-on|wireshark|packet capture|circuit simulator)\b/i.test(
      title
    ) ||
    (/\blab [0-9]+\b/i.test(fullText) && (hasDueDate || hasSubmissionVerbs))
  ) {
    return {
      type: "LAB",
      confidence: 0.91,
      reason: "Identified practical laboratory assignment or experimental deliverable",
      suggestedAction: "START_WORKSPACE",
      priority: hasDueDate ? "high" : "medium",
      suggestedEstimatedMinutes: 90,
    };
  }

  // 4. MULTI-PHASE PROJECTS & CAPSTONES
  if (
    /\b(term project|capstone|milestone|project phase|course project|semester project|group project)\b/i.test(
      fullText
    ) &&
    (hasDueDate || hasSubmissionVerbs)
  ) {
    return {
      type: "PROJECT",
      confidence: 0.92,
      reason: "Identified course project deliverable or multi-stage milestone",
      suggestedAction: "START_WORKSPACE",
      priority: "high",
      suggestedEstimatedMinutes: 150,
    };
  }

  // 5. READINGS & TEXTBOOK STUDY
  if (
    /\b(read chapter|required reading|textbook pages|assigned reading|read pages)\b/i.test(
      fullText
    ) &&
    !hasSubmissionVerbs
  ) {
    return {
      type: "READING",
      confidence: 0.88,
      reason: "Assigned textbook chapter or literature reading",
      suggestedAction: "CREATE_TASK",
      priority: "medium",
      suggestedEstimatedMinutes: 45,
    };
  }

  // 6. GENERAL ASSIGNMENT (has due date or explicit submission requirement)
  if (hasDueDate || hasSubmissionVerbs || /\b(homework|hw#?[0-9]|assignment|problem set|worksheet|write a|essay)\b/i.test(title)) {
    // Check if urgent
    let priority: AcademicPriority = "medium";
    if (params.dueAt) {
      const diffHours = (new Date(params.dueAt).getTime() - Date.now()) / (1000 * 60 * 60);
      if (diffHours < 48) priority = "critical";
      else if (diffHours < 120) priority = "high";
    }

    return {
      type: "ASSIGNMENT",
      confidence: 0.9,
      reason: "Detected formal assignment requiring deliverable submission",
      suggestedAction: "START_WORKSPACE",
      priority,
      suggestedEstimatedMinutes: 60,
    };
  }

  // 7. LECTURE MATERIAL (slides, class recordings, lecture notes)
  if (
    hasSlideAttachments ||
    /\b(lecture [0-9]|lecture slides|lecture notes|week [0-9] slides|session slides|class deck|video recording|presentation slides)\b/i.test(
      title
    ) ||
    /\b(slides attached|recording available|notes for today's lecture)\b/i.test(desc)
  ) {
    return {
      type: "LECTURE_MATERIAL",
      confidence: 0.93,
      reason: "Identified lecture slide presentation or class notes to organize in Drive",
      suggestedAction: "ORGANIZE_TO_DRIVE",
      priority: "low",
    };
  }

  // 8. REFERENCE MATERIAL (syllabus, formulas, cheat sheet, reference guide)
  if (
    /\b(syllabus|formula sheet|cheat sheet|handbook|reference manual|course guidelines|office hours schedule|faq)\b/i.test(
      fullText
    )
  ) {
    return {
      type: "REFERENCE_MATERIAL",
      confidence: 0.89,
      reason: "Course reference documentation or reference manual",
      suggestedAction: "ORGANIZE_TO_DRIVE",
      priority: "low",
    };
  }

  // 9. GENERAL ANNOUNCEMENT
  if (
    /\b(announcement|reminder|notice|welcome to|dear students|please note|heads up)\b/i.test(
      fullText
    )
  ) {
    return {
      type: "ANNOUNCEMENT",
      confidence: 0.85,
      reason: "Informational broadcast or instructor announcement",
      suggestedAction: "POST_ANNOUNCEMENT",
      priority: "low",
    };
  }

  // Default fallback
  return {
    type: "UNKNOWN",
    confidence: 0.5,
    reason: "General academic content without distinct classification markers",
    suggestedAction: "CREATE_TASK",
    priority: "medium",
    suggestedEstimatedMinutes: 30,
  };
}
