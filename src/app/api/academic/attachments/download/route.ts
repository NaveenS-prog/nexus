import { NextResponse } from "next/server";
import { getAcademicItems } from "@/lib/academic/storage";
import { processAcademicAttachment } from "@/lib/academic/attachmentProcessor";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { attachmentId, accountId } = body;

    if (!attachmentId) {
      return NextResponse.json(
        { success: false, error: "attachmentId is required." },
        { status: 400 }
      );
    }

    const items = await getAcademicItems();
    let targetAttachment = null;

    for (const item of items) {
      const match = (item.attachments || []).find((a) => a.id === attachmentId);
      if (match) {
        targetAttachment = match;
        break;
      }
    }

    if (!targetAttachment) {
      return NextResponse.json(
        { success: false, error: "Attachment not found." },
        { status: 404 }
      );
    }

    const result = await processAcademicAttachment(targetAttachment, accountId);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
