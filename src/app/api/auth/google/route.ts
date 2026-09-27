import { NextResponse } from "next/server";
import { getStoredCredentials } from "@/lib/integrations/config";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const queryClientId = url.searchParams.get("client_id");

  const creds = getStoredCredentials();
  const clientId = queryClientId || creds.googleClientId;

  if (!clientId) {
    return NextResponse.redirect(`${url.origin}/settings?error=missing_client_id`);
  }

  const redirectUri = `${url.origin}/api/auth/google/callback`;

  const scopes = [
    "https://www.googleapis.com/auth/tasks",
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/calendar.events",
    "openid",
    "email",
    "profile",
  ].join(" ");

  // Pack state safely (never place client secrets in OAuth state or query parameters)
  const stateData = JSON.stringify({
    cid: clientId,
  });
  const encodedState = Buffer.from(stateData).toString("base64url");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: scopes,
    access_type: "offline",
    prompt: "select_account consent",
    state: encodedState,
  });

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
}
