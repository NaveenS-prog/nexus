import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  // Forward to /api/auth/google preserving all query params
  return NextResponse.redirect(`${url.origin}/api/auth/google${url.search}`);
}
