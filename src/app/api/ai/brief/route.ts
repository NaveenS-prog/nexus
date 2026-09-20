import { NextResponse } from "next/server";
import { DailyBriefing } from "@/lib/types";

export async function GET() {
  const briefing: DailyBriefing = {
    date: new Date().toISOString(),
    greeting: "Good morning. Here's your high-impact briefing.",
    totalTasks: 6,
    urgentDeadlinesCount: 2,
    heaviestDayName: "Thursday",
    recommendedOrder: [
      { id: "item-2", title: "Finish OS Assignment 3: Page Replacement", priority: "critical", estimatedMinutes: 45, category: "academic" },
      { id: "item-7", title: "COA Lab Record & Pipeline Simulation", priority: "high", estimatedMinutes: 90, category: "academic" },
      { id: "item-6", title: "Java DSA Practice: Dynamic Programming", priority: "high", estimatedMinutes: 90, category: "personal" },
      { id: "item-4", title: "Implement Authentication API & Session Tokens", priority: "high", estimatedMinutes: 120, category: "project" },
    ],
    totalEstimatedMinutes: 345,
  };

  return NextResponse.json(briefing);
}
