import { NextResponse } from "next/server";
import { 
  analyzeAssignment, 
  generateAssignmentDraft, 
  approveAssignmentDraft 
} from "@/lib/academic/assignmentAgent";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ action: string }> }
) {
  try {
    const { action } = await params;
    const body = await req.json();
    const { itemId, userDirectives, finalNotes } = body;

    if (!itemId) {
      return NextResponse.json(
        { success: false, error: "itemId is required." },
        { status: 400 }
      );
    }

    if (action === "analyze") {
      const result = await analyzeAssignment(itemId);
      return NextResponse.json({
        success: true,
        workspace: result.workspace,
        requirementsCount: result.requirementsCount,
        message: `Extracted ${result.requirementsCount} requirements for assignment.`,
      });
    }

    if (action === "generate") {
      const result = await generateAssignmentDraft(itemId, userDirectives);
      return NextResponse.json({
        success: true,
        workspace: result.workspace,
        draftContent: result.draftContent,
        message: "Assignment draft generated and reviewed. Ready for user inspection.",
      });
    }

    if (action === "approve") {
      const workspace = await approveAssignmentDraft(itemId, finalNotes);
      return NextResponse.json({
        success: true,
        workspace,
        message: "Assignment approved by user and marked finalized.",
      });
    }

    return NextResponse.json(
      { success: false, error: `Unknown action: ${action}` },
      { status: 400 }
    );
  } catch (err: any) {
    console.error("[AssignmentAgentAPI] Error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to process assignment action." },
      { status: 500 }
    );
  }
}
