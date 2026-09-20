import { NextResponse } from "next/server";
import { getStoredCredentials } from "@/lib/integrations/config";

export async function GET(req: Request) {
  const creds = getStoredCredentials();
  const clientId = creds.googleClientId;

  if (!clientId) {
    return NextResponse.json(
      { error: "Google Client ID is not configured. Please add it in Settings." },
      { status: 400 }
    );
  }

  const url = new URL(req.url);
  const redirectUri = `${url.origin}/api/auth/google/callback`;

  const scopes = [
    "https://www.googleapis.com/auth/tasks",
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/calendar.events",
    "openid",
    "email",
    "profile",
  ].join(" ");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: scopes,
    access_type: "offline",
    prompt: "consent",
  });

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
}
