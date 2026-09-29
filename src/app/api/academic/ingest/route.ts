import { NextResponse } from "next/server";
import crypto from "crypto";
const uuidv4 = () => crypto.randomUUID();
import { 
  validatePairingToken, 
  findOrCreateCourse, 
  findItemByExternalId, 
  saveAcademicItem, 
  saveAttachment,
  getOrCreateWorkspace 
} from "@/lib/academic/storage";
import { normalizeRawPayload } from "@/lib/academic/normalizer";
import { classifyAcademicItem } from "@/lib/academic/classifier";
import { ExtensionCapturePayload } from "@/lib/types/academic";
import { createClient } from "@/lib/supabase/client";

export async function POST(req: Request) {
  try {
    // 1. Authenticate Request
    const authHeader = req.headers.get("authorization");
    let userId = "user_default";

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7).trim();
      const validation = await validatePairingToken(token);
      if (!validation.valid) {
        return NextResponse.json(
          { success: false, error: "Invalid or expired extension pairing token." },
          { status: 401 }
        );
      }
      if (validation.userId) {
        userId = validation.userId;
      }
    }

    // 2. Parse Ingestion Payload
    const rawBody: ExtensionCapturePayload = await req.json();

    if (!rawBody.title || !rawBody.courseName) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: title and courseName are mandatory." },
        { status: 400 }
      );
    }

    // 3. Normalize Payload
    const normalized = normalizeRawPayload({
      sourceUrl: rawBody.sourceUrl || "https://classroom.google.com",
      courseName: rawBody.courseName,
      courseCode: rawBody.courseCode,
      section: rawBody.section,
      title: rawBody.title,
      description: rawBody.description,
      instructions: rawBody.instructions,
      dueAt: rawBody.dueAt,
      publishedAt: rawBody.publishedAt,
      attachments: rawBody.attachments,
      sourceExternalId: rawBody.sourceExternalId,
    });

    // 4. Classify Academic Item Semantically
    const classification = classifyAcademicItem({
      title: normalized.title,
      description: normalized.description,
      instructions: normalized.instructions,
      dueAt: normalized.dueAt,
      attachments: normalized.attachments,
    });

    // 5. Match or Create Course
    const course = await findOrCreateCourse({
      name: normalized.course.name,
      courseCode: normalized.course.courseCode,
      section: normalized.course.section,
      externalCourseId: normalized.course.externalCourseId,
      source: rawBody.source || "CLASSROOM_BROWSER",
      userId,
    });

    // 6. Check Idempotency (Prevent Duplicates)
    const externalId = normalized.sourceExternalId || normalized.sourceUrl;
    const existing = await findItemByExternalId(
      rawBody.source || "CLASSROOM_BROWSER",
      externalId
    );

    let savedItem;
    let isCreated = false;
    let taskId: string | undefined = existing?.taskId;

    if (existing) {
      // Update existing item idempotently
      savedItem = await saveAcademicItem({
        ...existing,
        courseId: course.id,
        courseName: course.name,
        courseCode: course.courseCode,
        courseSection: course.section,
        title: normalized.title,
        description: normalized.description,
        instructions: normalized.instructions,
        dueAt: normalized.dueAt || existing.dueAt,
        type: classification.type,
        priority: classification.priority,
        metadata: {
          ...existing.metadata,
          classificationReason: classification.reason,
          confidence: classification.confidence,
          suggestedAction: classification.suggestedAction,
          lastIngestedAt: new Date().toISOString(),
        },
      });
    } else {
      isCreated = true;
      const newItemId = uuidv4();

      // Create linked Task in unified_items table if Supabase is enabled
      const taskGeneratedId = `task-academic-${uuidv4().substring(0, 8)}`;
      taskId = taskGeneratedId;

      const supabase = createClient();
      if (supabase && (classification.type === "ASSIGNMENT" || classification.type === "PROJECT" || classification.type === "LAB" || classification.type === "EXAM")) {
        try {
          await supabase.from("unified_items").insert({
            id: taskGeneratedId,
            user_id: userId,
            title: normalized.title,
            description: `[${course.name}] ${normalized.instructions.substring(0, 300)}...`,
            category: "academic",
            priority: classification.priority,
            status: "pending",
            source: "google_classroom",
            due_at: normalized.dueAt,
            metadata: {
              courseName: course.name,
              courseId: course.id,
              academicItemId: newItemId,
              sourceUrl: normalized.sourceUrl,
            },
          });
        } catch {}
      }

      savedItem = await saveAcademicItem({
        id: newItemId,
        userId,
        source: rawBody.source || "CLASSROOM_BROWSER",
        sourceExternalId: externalId,
        sourceUrl: normalized.sourceUrl,
        type: classification.type,
        courseId: course.id,
        courseName: course.name,
        courseCode: course.courseCode,
        courseSection: course.section,
        title: normalized.title,
        description: normalized.description,
        instructions: normalized.instructions,
        publishedAt: normalized.publishedAt || new Date().toISOString(),
        dueAt: normalized.dueAt || undefined,
        status: "NEW",
        priority: classification.priority,
        taskId,
        metadata: {
          classificationReason: classification.reason,
          confidence: classification.confidence,
          suggestedAction: classification.suggestedAction,
          accountEmail: rawBody.accountEmail,
        },
        rawSourceData: rawBody as any,
      });

      // Initialize AI Workspace if deliverable-oriented
      if (["ASSIGNMENT", "PROJECT", "LAB"].includes(classification.type)) {
        await getOrCreateWorkspace(savedItem.id, "MARKDOWN", userId);
      }
    }

    // 7. Save Attachments
    const savedAttachments = [];
    for (const att of normalized.attachments) {
      const savedAtt = await saveAttachment({
        userId,
        academicItemId: savedItem.id,
        source: rawBody.source || "CLASSROOM_BROWSER",
        name: att.name,
        originalName: att.originalName,
        mimeType: att.mimeType,
        sourceUrl: att.sourceUrl,
        driveFileId: att.driveFileId,
        downloadStatus: att.driveFileId ? "NOT_REQUESTED" : "UNAVAILABLE",
        processingStatus: "NOT_PROCESSED",
      });
      savedAttachments.push(savedAtt);
    }

    savedItem.attachments = savedAttachments;

    return NextResponse.json({
      success: true,
      created: isCreated,
      item: savedItem,
      taskId,
      classification: {
        type: classification.type,
        confidence: classification.confidence,
        reason: classification.reason,
        suggestedAction: classification.suggestedAction,
      },
      message: isCreated
        ? `Successfully ingested "${savedItem.title}" into ${course.name}.`
        : `Successfully updated "${savedItem.title}".`,
    });
  } catch (err: any) {
    console.error("[AcademicIngest] Error processing ingestion:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
