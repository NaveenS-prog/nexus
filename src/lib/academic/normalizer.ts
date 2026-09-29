// ==============================================================================
// NEXUS Academic Intelligence Layer - Normalizer
// ==============================================================================

import { RawClassroomAttachment } from "@/lib/types/academic";
import { parseISO, addDays, setHours, setMinutes, setSeconds, isValid } from "date-fns";

export interface NormalizedCourseInfo {
  name: string;
  courseCode?: string;
  section?: string;
  externalCourseId?: string;
}

export interface NormalizedAcademicPayload {
  sourceExternalId?: string;
  sourceUrl: string;
  course: NormalizedCourseInfo;
  title: string;
  description: string;
  instructions: string;
  dueAt: string | null;
  publishedAt: string | null;
  attachments: Array<{
    name: string;
    originalName: string;
    mimeType: string;
    sourceUrl?: string;
    driveFileId?: string;
  }>;
}

// Extract course code, name, section, and Classroom course ID
export function normalizeCourseInfo(courseRaw: string, sourceUrl?: string): NormalizedCourseInfo {
  let name = (courseRaw || "General Academics").trim();
  let courseCode: string | undefined = undefined;
  let section: string | undefined = undefined;
  let externalCourseId: string | undefined = undefined;

  // Extract external course ID from URL: /c/{courseId}
  if (sourceUrl) {
    const match = sourceUrl.match(/\/c\/([a-zA-Z0-9_\-]+)/);
    if (match) {
      externalCourseId = match[1];
    }
  }

  // Common pattern: "CS301: Operating Systems - Fall 2026" or "[CS301] Operating Systems (Sec 01)"
  const codeMatch = name.match(/^\[?([A-Z]{2,5}\s?-?\s?[0-9]{2,4}[A-Z]?)\]?[:\-\s]+(.*)$/i);
  if (codeMatch) {
    courseCode = codeMatch[1].replace(/\s+/g, "").toUpperCase();
    name = codeMatch[2].trim();
  }

  // Section pattern: "... - Fall 2026" or "... (Section 01)"
  const sectionMatch = name.match(/[\(\-]\s*(Fall\s*\d{4}|Spring\s*\d{4}|Summer\s*\d{4}|Sec(?:tion)?\s*\d+|Period\s*\d+)[\)]?$/i);
  if (sectionMatch) {
    section = sectionMatch[1].trim();
    name = name.replace(sectionMatch[0], "").trim();
  }

  // Clean trailing punctuation
  name = name.replace(/[:\-–—]+$/, "").trim();

  return {
    name: name || "General Academics",
    courseCode,
    section,
    externalCourseId,
  };
}

// Bulletproof parser for Classroom due date strings
export function normalizeDueDate(rawDate?: string | null): string | null {
  if (!rawDate || typeof rawDate !== "string") return null;
  const str = rawDate.trim();
  if (!str || str.toLowerCase() === "no due date") return null;

  // 1. Try ISO parse first
  try {
    const d = parseISO(str);
    if (isValid(d)) return d.toISOString();
  } catch {}

  // 2. Try native Date constructor
  try {
    const d = new Date(str);
    if (isValid(d) && !isNaN(d.getTime())) return d.toISOString();
  } catch {}

  // 3. Handle relative Classroom dates like "Due Tomorrow, 11:59 PM" or "Tomorrow at 11:59 PM"
  const lower = str.toLowerCase();
  const now = new Date();

  if (lower.includes("tomorrow")) {
    let target = addDays(now, 1);
    target = setHours(target, 23);
    target = setMinutes(target, 59);
    target = setSeconds(target, 0);
    return target.toISOString();
  }

  if (lower.includes("today")) {
    let target = setHours(now, 23);
    target = setMinutes(target, 59);
    target = setSeconds(target, 0);
    return target.toISOString();
  }

  return null;
}

// Extract external ID from Google Classroom work item URL
export function extractClassroomItemId(url: string): string | undefined {
  if (!url) return undefined;
  // Match /c/{courseId}/a/{workId} or /c/{courseId}/m/{materialId} or /c/{courseId}/sa/{submissionId}
  const match = url.match(/\/c\/[^\/]+\/(?:a|m|sa|p)\/([a-zA-Z0-9_\-]+)/);
  if (match) {
    return match[1];
  }
  return undefined;
}

// Resolve Drive File ID from Google Drive URL
export function extractDriveFileId(url?: string): string | undefined {
  if (!url) return undefined;
  // drive.google.com/file/d/{id} or drive.google.com/open?id={id}
  const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_\-]+)/);
  if (fileMatch) return fileMatch[1];

  const idMatch = url.match(/[?&]id=([a-zA-Z0-9_\-]+)/);
  if (idMatch) return idMatch[1];

  return undefined;
}

// Infer MIME type from file extension or URL
export function inferMimeType(filename: string, url?: string): string {
  const lower = (filename || "").toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".pptx")) return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  if (lower.endsWith(".ppt")) return "application/vnd.ms-powerpoint";
  if (lower.endsWith(".docx")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (lower.endsWith(".doc")) return "application/msword";
  if (lower.endsWith(".xlsx")) return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  if (lower.endsWith(".py")) return "text/x-python";
  if (lower.endsWith(".java")) return "text/x-java-source";
  if (lower.endsWith(".cpp") || lower.endsWith(".c")) return "text/x-c";
  if (lower.endsWith(".zip")) return "application/zip";
  if (lower.endsWith(".txt")) return "text/plain";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";

  if (url?.includes("docs.google.com/document")) return "application/vnd.google-apps.document";
  if (url?.includes("docs.google.com/presentation")) return "application/vnd.google-apps.presentation";
  if (url?.includes("docs.google.com/spreadsheets")) return "application/vnd.google-apps.spreadsheet";
  if (url?.includes("youtube.com") || url?.includes("youtu.be")) return "video/youtube";

  return "application/octet-stream";
}

export function normalizeRawPayload(raw: {
  sourceUrl: string;
  courseName: string;
  courseCode?: string;
  section?: string;
  title: string;
  description?: string;
  instructions?: string;
  dueAt?: string | null;
  publishedAt?: string | null;
  attachments?: RawClassroomAttachment[];
  sourceExternalId?: string;
}): NormalizedAcademicPayload {
  const course = normalizeCourseInfo(raw.courseName, raw.sourceUrl);
  if (raw.courseCode) course.courseCode = raw.courseCode;
  if (raw.section) course.section = raw.section;

  const sourceExternalId = raw.sourceExternalId || extractClassroomItemId(raw.sourceUrl);
  const dueAt = normalizeDueDate(raw.dueAt);
  const publishedAt = normalizeDueDate(raw.publishedAt);

  const attachments = (raw.attachments || []).map((att) => {
    const driveFileId = extractDriveFileId(att.url) || att.driveFileId;
    const mimeType = att.mimeType || inferMimeType(att.name, att.url);
    return {
      name: att.name || "Attachment",
      originalName: att.name || "Attachment",
      mimeType,
      sourceUrl: att.url,
      driveFileId,
    };
  });

  return {
    sourceExternalId,
    sourceUrl: raw.sourceUrl,
    course,
    title: (raw.title || "Untitled Academic Item").trim(),
    description: (raw.description || "").trim(),
    instructions: (raw.instructions || raw.description || "").trim(),
    dueAt,
    publishedAt,
    attachments,
  };
}
