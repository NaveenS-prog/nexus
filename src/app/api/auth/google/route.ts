import { NextResponse } from "next/server";
import { getStoredCredentials } from "@/lib/integrations/config";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const queryClientId = url.searchParams.get("client_id");
  const requestedAccountType = url.searchParams.get("account_type") || "personal";

  const loginHint = url.searchParams.get("login_hint");

  const creds = getStoredCredentials();
  let clientId = queryClientId || creds.googleClientId || process.env.GOOGLE_CLIENT_ID;
  let clientSecret = creds.googleClientSecret || process.env.GOOGLE_CLIENT_SECRET;

  // Fallback to any account that has credentials saved
  if (!clientId && creds.googleAccounts) {
    const acc = Object.values(creds.googleAccounts).find((a) => a.clientId);
    if (acc?.clientId) clientId = acc.clientId;
  }
  if (!clientSecret && creds.googleAccounts) {
    const acc = Object.values(creds.googleAccounts).find((a) => a.clientSecret);
    if (acc?.clientSecret) clientSecret = acc.clientSecret;
  }

  if (!clientId) {
    return NextResponse.redirect(`${url.origin}/settings?tab=google&error=missing_client_id`);
  }

  if (!clientSecret) {
    return NextResponse.redirect(`${url.origin}/settings?tab=google&error=missing_client_secret`);
  }

  const redirectUri = `${url.origin}/api/auth/google/callback`;

  // Comprehensive scopes for Calendar, Tasks, Classroom, and Drive
  const scopes = [
    "https://www.googleapis.com/auth/tasks",
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/classroom.courses.readonly",
    "https://www.googleapis.com/auth/classroom.coursework.me.readonly",
    "https://www.googleapis.com/auth/classroom.announcements.readonly",
    "https://www.googleapis.com/auth/drive.file",
    "openid",
    "email",
    "profile",
  ].join(" ");

  // Pack state safely (store client ID hint and requested account classification)
  const stateData = JSON.stringify({
    cid: clientId,
    accountType: requestedAccountType,
    ts: Date.now(),
  });
  const encodedState = Buffer.from(stateData).toString("base64url");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: scopes,
    access_type: "offline",
    // prompt=select_account ensures user can explicitly choose which Google account to connect
    prompt: "select_account consent",
    state: encodedState,
  });

  if (loginHint) {
    params.set("login_hint", loginHint);
  }

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
}
