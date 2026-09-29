import { NextResponse } from "next/server";
import { organizeAcademicItemToDrive } from "@/lib/academic/driveOrganizer";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { itemId, accountId } = body;

    if (!itemId) {
      return NextResponse.json(
        { success: false, error: "itemId is required." },
        { status: 400 }
      );
    }

    const result = await organizeAcademicItemToDrive(itemId, accountId);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[DriveOrganizeAPI] Error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to organize into Google Drive." },
      { status: 500 }
    );
  }
}
