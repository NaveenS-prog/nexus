import { NextResponse } from "next/server";
import crypto from "crypto";
const uuidv4 = () => crypto.randomUUID();
import { 
  getAcademicItemById, 
  findOrCreateCourse, 
  saveAcademicItem,
  getOrCreateWorkspace
} from "@/lib/academic/storage";
import { createClient } from "@/lib/supabase/client";
import { AcademicItemType } from "@/lib/types/academic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { itemId, courseName, courseCode, title, dueAt, type } = body;

    if (!itemId) {
      return NextResponse.json(
        { success: false, error: "Missing required parameter: itemId" },
        { status: 400 }
      );
    }

    if (!courseName || !courseName.trim()) {
      return NextResponse.json(
        { success: false, error: "Missing required parameter: courseName" },
        { status: 400 }
      );
    }

    const existing = await getAcademicItemById(itemId);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: `Academic item with ID ${itemId} not found.` },
        { status: 404 }
      );
    }

    // Match or create the target course
    const course = await findOrCreateCourse({
      name: courseName.trim(),
      courseCode: courseCode ? courseCode.trim().toUpperCase() : undefined,
      source: existing.source,
      userId: existing.userId,
    });

    const targetType: AcademicItemType = type || existing.type;
    const isActionable = ["ASSIGNMENT", "PROJECT", "LAB", "EXAM"].includes(targetType);
    let taskId = existing.taskId;

    // Create linked task in unified_items if actionable and not already created
    if (isActionable && !taskId) {
      taskId = `task-academic-${uuidv4().substring(0, 8)}`;
      const supabase = createClient();
      if (supabase) {
        try {
          await supabase.from("unified_items").insert({
            id: taskId,
            user_id: existing.userId || "user_default",
            title: title ? title.trim() : existing.title,
            description: `[${course.name}] ${(existing.instructions || existing.description || "").substring(0, 300)}...`,
            category: "academic",
            priority: existing.priority || "medium",
            status: "pending",
            source: existing.source === "FILE_IMPORT" ? "file_import" : "google_classroom",
            due_at: dueAt !== undefined ? dueAt : existing.dueAt,
            metadata: {
              courseName: course.name,
              courseId: course.id,
              academicItemId: existing.id,
              sourceUrl: existing.sourceUrl,
            },
          });
        } catch (taskErr) {
          console.warn("[AcademicConfirm] Could not insert linked task into Supabase:", taskErr);
        }
      }
    }

    // If changing to an actionable deliverable, ensure an AI workspace exists
    if (["ASSIGNMENT", "PROJECT", "LAB"].includes(targetType)) {
      try {
        await getOrCreateWorkspace(existing.id, "MARKDOWN", existing.userId);
      } catch {}
    }

    // Clean metadata
    const updatedMetadata = {
      ...(existing.metadata || {}),
      needsConfirmation: false,
      confirmedAt: new Date().toISOString(),
    };
    delete (updatedMetadata as any).missingFields;

    const updatedItem = await saveAcademicItem({
      ...existing,
      courseId: course.id,
      courseName: course.name,
      courseCode: course.courseCode || existing.courseCode,
      title: title && title.trim() ? title.trim() : existing.title,
      dueAt: dueAt !== undefined ? dueAt : existing.dueAt,
      type: targetType,
      status: "NEW",
      taskId,
      metadata: updatedMetadata,
    });

    return NextResponse.json({
      success: true,
      item: updatedItem,
      message: `Successfully confirmed "${updatedItem.title}" for ${course.name}.`,
    });
  } catch (err: any) {
    console.error("[AcademicConfirm] Error confirming item:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
