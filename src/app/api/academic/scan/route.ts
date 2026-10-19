import { NextResponse } from "next/server";
import { scanAllWatchSources } from "@/lib/academic/sourceManager";

export async function POST() {
  try {
    const result = await scanAllWatchSources();
    return NextResponse.json({
      success: true,
      result,
      message: `Scanned ${result.totalFiles} files across ${result.sourcesScanned} watch directories. Ingested ${result.itemsCreated} new items (${result.duplicatesSkipped} duplicates skipped).`,
    });
  } catch (err: any) {
    console.error("[AcademicScan] Error during scan:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
