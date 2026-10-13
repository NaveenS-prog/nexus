// ==============================================================================
// NEXUS Academic Intelligence Layer - Core Local File Ingestion Service
// ==============================================================================

import crypto from "crypto";
const uuidv4 = () => crypto.randomUUID();
import {
  findOrCreateCourse,
  findItemByExternalId,
  saveAcademicItem,
  saveAttachment,
  getOrCreateWorkspace,
  getAcademicItems,
} from "./storage";
import { inferMetadataFromFile, InferredFileMetadata } from "./fileInference";
import { organizeAcademicItemToDrive } from "./driveOrganizer";
import { AcademicItem } from "@/lib/types/academic";
import { createClient } from "@/lib/supabase/client";

export interface FileIngestOptions {
  inboxRootDir?: string;
  userId?: string;
  preferredAccountId?: string;
  autoOrganizeDrive?: boolean;
}

export interface FileIngestResult {
  success: boolean;
  item: AcademicItem;
  created: boolean;
  duplicate: boolean;
  taskId?: string;
  metadata: InferredFileMetadata;
  driveOrganized?: boolean;
  message: string;
}

/**
 * Ingests a real local file from disk into the NEXUS Academic Intelligence pipeline
 */
export async function ingestLocalFile(
  filePath: string,
  options?: FileIngestOptions
): Promise<FileIngestResult> {
  const userId = options?.userId || "user_default";

  // 1. Infer metadata and compute SHA-256 hash
  const inferred = inferMetadataFromFile(filePath, options?.inboxRootDir);
  const externalId = `hash:${inferred.contentHash}`;

  // 2. Check Idempotency (Prevent duplicate capture of same file content)
  const existingByHash = await findItemByExternalId("FILE_IMPORT", externalId);
  if (existingByHash) {
    return {
      success: true,
      item: existingByHash,
      created: false,
      duplicate: true,
      taskId: existingByHash.taskId,
      metadata: inferred,
      message: `File "${inferred.fileName}" is already ingested with identical SHA-256 content hash.`,
    };
  }

  // Also check if any existing item already has an attachment with identical contentHash
  const allItems = await getAcademicItems();
  const duplicateAttachmentItem = allItems.find((item) =>
    (item.attachments || []).some((att) => att.contentHash === inferred.contentHash)
  );

  if (duplicateAttachmentItem) {
    return {
      success: true,
      item: duplicateAttachmentItem,
      created: false,
      duplicate: true,
      taskId: duplicateAttachmentItem.taskId,
      metadata: inferred,
      message: `File "${inferred.fileName}" already exists as an attachment for "${duplicateAttachmentItem.title}".`,
    };
  }

  // 3. Match or Create Course
  const course = await findOrCreateCourse({
    name: inferred.courseName,
    courseCode: inferred.courseCode,
    section: inferred.section,
    source: "FILE_IMPORT",
    userId,
  });

  const newItemId = uuidv4();
  const isActionable = ["ASSIGNMENT", "PROJECT", "LAB", "EXAM"].includes(inferred.type);

  // 4. Create linked Task only if actionable and confirmed
  let taskId: string | undefined = undefined;
  if (isActionable && inferred.status !== "NEEDS_CONFIRMATION") {
    taskId = `task-academic-${uuidv4().substring(0, 8)}`;

    const supabase = createClient();
    if (supabase) {
      try {
        await supabase.from("unified_items").insert({
          id: taskId,
          user_id: userId,
          title: inferred.title,
          description: `[${course.name}] ${inferred.instructions ? inferred.instructions.substring(0, 300) : inferred.fileName}`,
          category: "academic",
          priority: inferred.priority,
          status: "pending",
          source: "file_import",
          due_at: inferred.dueAt,
          metadata: {
            courseName: course.name,
            courseId: course.id,
            academicItemId: newItemId,
            sourcePath: inferred.filePath,
            contentHash: inferred.contentHash,
          },
        });
      } catch (tErr) {
        console.warn("[FileIngest] Unified item creation warning:", tErr);
      }
    }
  }

  // 5. Save Academic Item
  const savedItem = await saveAcademicItem({
    id: newItemId,
    userId,
    source: "FILE_IMPORT",
    sourceExternalId: externalId,
    sourceUrl: `file://${inferred.filePath}`,
    type: inferred.type,
    courseId: course.id,
    courseName: course.name,
    courseCode: course.courseCode,
    courseSection: course.section,
    title: inferred.title,
    description: inferred.instructions ? inferred.instructions.substring(0, 500) : `Imported from ${inferred.fileName}`,
    instructions: inferred.instructions,
    publishedAt: new Date().toISOString(),
    dueAt: inferred.dueAt || undefined,
    status: inferred.status,
    priority: inferred.priority,
    taskId,
    metadata: {
      sourcePath: inferred.filePath,
      fileName: inferred.fileName,
      contentHash: inferred.contentHash,
      fileSize: inferred.size,
      mimeType: inferred.mimeType,
      confidence: inferred.confidence,
      classificationReason: inferred.classificationReason,
      needsConfirmation: inferred.needsConfirmation,
      missingFields: inferred.missingFields,
      ingestedAt: new Date().toISOString(),
    },
    rawSourceData: {
      filePath: inferred.filePath,
      fileName: inferred.fileName,
      size: inferred.size,
    },
  });

  // 6. Save Academic Attachment
  const savedAtt = await saveAttachment({
    userId,
    academicItemId: savedItem.id,
    source: "FILE_IMPORT",
    name: inferred.fileName,
    originalName: inferred.fileName,
    mimeType: inferred.mimeType,
    size: inferred.size,
    storagePath: inferred.filePath,
    contentHash: inferred.contentHash,
    downloadStatus: "DOWNLOADED",
    processingStatus: inferred.extractedText ? "PROCESSED" : "NOT_PROCESSED",
    extractedText: inferred.extractedText,
    metadata: {
      inferredFrom: inferred.filePath,
    },
  });

  savedItem.attachments = [savedAtt];

  // 7. Initialize Workspace for deliverable items
  if (isActionable) {
    try {
      await getOrCreateWorkspace(savedItem.id, "MARKDOWN", userId);
    } catch {}
  }

  // 8. Optional Google Drive Organization (Never fails local ingestion if Drive is unauthorized)
  let driveOrganized = false;
  if (options?.autoOrganizeDrive) {
    try {
      const driveResult = await organizeAcademicItemToDrive(savedItem.id, options.preferredAccountId);
      driveOrganized = Boolean(driveResult.success);
    } catch (dErr) {
      // Local ingestion always succeeds regardless of Drive state
      console.info("[FileIngest] Google Drive organization skipped (offline or not connected):", dErr);
    }
  }

  const statusDesc = inferred.needsConfirmation
    ? "Ingested (Requires user confirmation for missing metadata)"
    : `Ingested as ${inferred.type} in "${course.name}"`;

  return {
    success: true,
    item: savedItem,
    created: true,
    duplicate: false,
    taskId,
    metadata: inferred,
    driveOrganized,
    message: `Successfully ingested "${inferred.fileName}": ${statusDesc}.`,
  };
}
