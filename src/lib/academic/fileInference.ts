// ==============================================================================
// NEXUS Academic Intelligence Layer - Local File Metadata Inference
// ==============================================================================

import fs from "fs";
import path from "path";
import { inferMimeType, normalizeCourseInfo, normalizeDueDate } from "./normalizer";
import { classifyAcademicItem } from "./classifier";
import { computeContentHash, extractTextFromContent } from "./attachmentProcessor";
import { AcademicItemType, AcademicPriority, AcademicItemStatus } from "@/lib/types/academic";

export interface InferredFileMetadata {
  filePath: string;
  fileName: string;
  contentHash: string;
  size: number;
  mimeType: string;
  courseName: string;
  courseCode?: string;
  section?: string;
  title: string;
  instructions: string;
  dueAt: string | null;
  type: AcademicItemType;
  priority: AcademicPriority;
  confidence: number;
  classificationReason: string;
  needsConfirmation: boolean;
  missingFields: string[];
  status: AcademicItemStatus;
  extractedText?: string;
}

const COMMON_GENERIC_FOLDERS = new Set([
  "inbox",
  "academic inbox",
  "nexus academic inbox",
  "downloads",
  "documents",
  "assignments",
  "lectures",
  "materials",
  "homework",
  "labs",
  "slides",
  "files",
  "desktop",
]);

/**
 * Extracts course code pattern (e.g., CS301, MATH 205, BIO-101, EECS 281)
 */
function extractCourseCode(text: string): { code?: string; cleanedText: string } {
  const match = text.match(/\b([A-Z]{2,5}\s?[-_ ]?\s?[0-9]{2,4}[A-Z]?)\b/i);
  if (match) {
    const rawCode = match[1];
    const normalizedCode = rawCode.replace(/[-_ ]/g, "").toUpperCase();
    const cleanedText = text.replace(match[0], "").trim();
    return { code: normalizedCode, cleanedText };
  }
  return { cleanedText: text };
}

/**
 * Infers course, title, due date, and academic classification from local file
 */
export function inferMetadataFromFile(
  filePath: string,
  inboxRootDir?: string
): InferredFileMetadata {
  const resolvedPath = path.resolve(filePath);
  const fileStats = fs.statSync(resolvedPath);
  const buffer = fs.readFileSync(resolvedPath);

  const fileName = path.basename(resolvedPath);
  const ext = path.extname(resolvedPath);
  const rawBaseName = path.basename(resolvedPath, ext);
  const mimeType = inferMimeType(fileName);
  const contentHash = computeContentHash(buffer);
  const size = fileStats.size;

  // Extract readable text if supported
  const extractedText = extractTextFromContent(buffer, mimeType);

  let inferredCourseName = "";
  let inferredCourseCode: string | undefined = undefined;
  let inferredSection: string | undefined = undefined;
  let inferredDueDate: string | null = null;
  let workingTitle = rawBaseName.replace(/[_\-]+/g, " ").trim();
  const missingFields: string[] = [];

  // 1. Infer from directory hierarchy if file is within a subfolder
  if (inboxRootDir) {
    const rel = path.relative(inboxRootDir, resolvedPath);
    const parts = rel.split(path.sep);

    if (parts.length > 1) {
      // Iterate through directory segments from top down
      for (let i = 0; i < parts.length - 1; i++) {
        const segment = parts[i].trim();
        const lowerSegment = segment.toLowerCase();

        if (COMMON_GENERIC_FOLDERS.has(lowerSegment)) {
          continue;
        }

        // Check if directory segment contains course code
        const { code, cleanedText } = extractCourseCode(segment);
        if (code) {
          inferredCourseCode = code;
          inferredCourseName = cleanedText || segment;
          break;
        }

        if (!inferredCourseName && segment.length >= 3) {
          const courseInfo = normalizeCourseInfo(segment);
          inferredCourseName = courseInfo.name;
          if (courseInfo.courseCode) inferredCourseCode = courseInfo.courseCode;
          if (courseInfo.section) inferredSection = courseInfo.section;
          break;
        }
      }
    }
  }

  // 2. Infer from Filename if course still not found
  if (!inferredCourseName) {
    const { code, cleanedText } = extractCourseCode(workingTitle);
    if (code) {
      inferredCourseCode = code;
      workingTitle = cleanedText;
      // Derive readable course name from code
      inferredCourseName = code;
    }
  }

  // 3. Infer Due Date from Filename (e.g. "Due Oct 24", "due-2026-10-25")
  const dueMatch = workingTitle.match(/\bdue\s*[-_:]?\s*([A-Za-z]{3,9}\s*\d{1,2}(?:\s*\d{4})?|\d{4}-\d{2}-\d{2})\b/i);
  if (dueMatch) {
    inferredDueDate = normalizeDueDate(dueMatch[1]);
    workingTitle = workingTitle.replace(dueMatch[0], "").trim();
  }

  // 4. Infer from Document Text (first 2500 characters)
  if (extractedText) {
    const textSample = extractedText.substring(0, 2500);

    // Look for explicit Course line: "Course: CS301 Operating Systems"
    if (!inferredCourseName) {
      const courseTextMatch = textSample.match(/(?:Course|Class|Subject|Module)\s*[:\-–]\s*([^\r\n]{3,60})/i);
      if (courseTextMatch) {
        const rawCourse = courseTextMatch[1].trim();
        const courseInfo = normalizeCourseInfo(rawCourse);
        inferredCourseName = courseInfo.name;
        if (courseInfo.courseCode) inferredCourseCode = courseInfo.courseCode;
        if (courseInfo.section) inferredSection = courseInfo.section;
      }
    }

    // Look for explicit Due Date in text: "Due: October 28, 2026"
    if (!inferredDueDate) {
      const dueTextMatch = textSample.match(/(?:Due Date|Due|Deadline|Submission Deadline)\s*[:\-–]\s*([^\r\n]{5,40})/i);
      if (dueTextMatch) {
        inferredDueDate = normalizeDueDate(dueTextMatch[1].trim());
      }
    }
  }

  // Clean title
  let title = workingTitle
    .replace(/^[:\-–\s]+|[:\-–\s]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!title || title.length < 2) {
    title = rawBaseName;
  }

  // Check required metadata availability
  let needsConfirmation = false;

  if (!inferredCourseName) {
    // Do NOT invent a fake course name!
    inferredCourseName = "Pending Course Assignment";
    missingFields.push("courseName");
    needsConfirmation = true;
  }

  if (title.toLowerCase() === "document" || title.toLowerCase() === "file" || title.toLowerCase() === "scan") {
    missingFields.push("title");
    needsConfirmation = true;
  }

  // 5. Semantic Classification
  const classification = classifyAcademicItem({
    title,
    description: extractedText ? extractedText.substring(0, 600) : fileName,
    instructions: extractedText ? extractedText.substring(0, 600) : "",
    dueAt: inferredDueDate,
    attachments: [{ name: fileName, mimeType }],
  });

  // If confidence is low, require confirmation
  if (classification.confidence < 0.6) {
    needsConfirmation = true;
    missingFields.push("type");
  }

  const status: AcademicItemStatus = needsConfirmation ? "NEEDS_CONFIRMATION" : "NEW";

  return {
    filePath: resolvedPath,
    fileName,
    contentHash,
    size,
    mimeType,
    courseName: inferredCourseName,
    courseCode: inferredCourseCode,
    section: inferredSection,
    title,
    instructions: extractedText || "",
    dueAt: inferredDueDate,
    type: classification.type,
    priority: classification.priority,
    confidence: classification.confidence,
    classificationReason: classification.reason,
    needsConfirmation,
    missingFields,
    status,
    extractedText,
  };
}
