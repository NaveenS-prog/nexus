import { NextResponse } from "next/server";
import { 
  getAcademicItems, 
  updateAcademicItemStatus, 
  deleteAcademicItem,
  getAcademicCourses 
} from "@/lib/academic/storage";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || undefined;
    const courseId = searchParams.get("courseId") || undefined;
    const status = searchParams.get("status") || undefined;
    const search = searchParams.get("search") || undefined;
    const userId = searchParams.get("userId") || undefined;

    const items = await getAcademicItems({
      type,
      courseId,
      status,
      search,
      userId,
    });

    const courses = await getAcademicCourses(userId);

    // Compute genuine statistics from real user items
    const stats = {
      total: items.length,
      assignments: items.filter((i) => i.type === "ASSIGNMENT" || i.type === "PROJECT" || i.type === "LAB").length,
      materials: items.filter((i) => i.type === "LECTURE_MATERIAL" || i.type === "REFERENCE_MATERIAL").length,
      exams: items.filter((i) => i.type === "EXAM").length,
      activeCourses: courses.length,
      needsReview: items.filter((i) => i.status === "READY_FOR_REVIEW").length,
    };

    return NextResponse.json({
      success: true,
      items,
      courses,
      stats,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, status, metadata } = body;

    if (!id || !status) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: id and status." },
        { status: 400 }
      );
    }

    await updateAcademicItemStatus(id, status, metadata);

    return NextResponse.json({
      success: true,
      message: `Item status updated to ${status}.`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "id parameter is required." }, { status: 400 });
    }

    await deleteAcademicItem(id);

    return NextResponse.json({
      success: true,
      message: "Academic item deleted successfully.",
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
