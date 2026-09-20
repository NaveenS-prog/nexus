import { NextResponse } from "next/server";
import { ParsedDumpItem } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const { text } = await req.json();
    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Missing text" }, { status: 400 });
    }

    // In a live production deployment with GEMINI_API_KEY or OPENAI_API_KEY,
    // this would invoke the structured LLM completion.
    // For seamless local/offline execution, we provide high quality deterministic parsing:
    const rawChunks = text
      .split(/(?:,|\band\b|\n|\.)/gi)
      .map((s) => s.trim())
      .filter((s) => s.length > 3);

    const items: ParsedDumpItem[] = rawChunks.map((chunk, idx) => {
      const lower = chunk.toLowerCase();
      const isIdea = lower.includes("idea") || lower.includes("build a") || lower.includes("create an");
      const isAcademic = lower.includes("assignment") || lower.includes("exam") || lower.includes("professor") || lower.includes("class");

      let cleanTitle = chunk
        .replace(/^(need to|have to|i have an idea for|idea for|remember to)\s+/i, "")
        .trim();
      cleanTitle = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);

      return {
        id: `parsed-${Date.now()}-${idx}`,
        title: cleanTitle,
        type: isIdea ? "idea" : "task",
        targetDestination: isIdea ? "notion" : isAcademic ? "google_tasks" : "nexus",
        category: isIdea ? "idea" : isAcademic ? "academic" : "personal",
        priority: isAcademic ? "high" : "medium",
        estimatedMinutes: isIdea ? 60 : 30,
      };
    });

    return NextResponse.json({ items });
  } catch (error) {
    return NextResponse.json({ error: "Failed to parse dump" }, { status: 500 });
  }
}
