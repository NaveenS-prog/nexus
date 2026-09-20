import { NextResponse } from "next/server";
import { MOCK_INTEGRATIONS } from "@/lib/data/mockData";

export async function POST() {
  // Simulates provider polling and two-way cache update
  return NextResponse.json({
    success: true,
    lastSyncedAt: new Date().toISOString(),
    services: MOCK_INTEGRATIONS,
  });
}

export async function GET() {
  return NextResponse.json({
    status: "healthy",
    lastSyncedAt: new Date().toISOString(),
    services: MOCK_INTEGRATIONS,
  });
}
