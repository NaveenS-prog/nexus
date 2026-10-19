import { NextResponse } from "next/server";
import { getWatchSources, addWatchSource, removeWatchSource, toggleWatchSource } from "@/lib/academic/sourceManager";

export async function GET() {
  try {
    const sources = getWatchSources();
    return NextResponse.json({ success: true, sources });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, path: folderPath, label, id, enabled } = body;

    if (action === "add") {
      if (!folderPath || typeof folderPath !== "string") {
        return NextResponse.json(
          { success: false, error: "Missing required parameter: path" },
          { status: 400 }
        );
      }
      const source = addWatchSource(folderPath, label);
      return NextResponse.json({ success: true, source, sources: getWatchSources() });
    }

    if (action === "remove") {
      if (!id) {
        return NextResponse.json(
          { success: false, error: "Missing required parameter: id" },
          { status: 400 }
        );
      }
      const removed = removeWatchSource(id);
      return NextResponse.json({ success: removed, sources: getWatchSources() });
    }

    if (action === "toggle") {
      if (!id || typeof enabled !== "boolean") {
        return NextResponse.json(
          { success: false, error: "Missing required parameters: id and enabled" },
          { status: 400 }
        );
      }
      const toggled = toggleWatchSource(id, enabled);
      return NextResponse.json({ success: toggled, sources: getWatchSources() });
    }

    return NextResponse.json(
      { success: false, error: `Invalid action: ${action}` },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
