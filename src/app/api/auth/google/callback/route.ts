import { NextResponse } from "next/server";
import { getStoredCredentials, saveStoredCredentials } from "@/lib/integrations/config";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const state = url.searchParams.get("state");

  if (error) {
    return NextResponse.redirect(`${url.origin}/settings?error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return NextResponse.redirect(`${url.origin}/settings?error=no_code_provided`);
  }

  let clientId = "";
  let clientSecret = "";

  if (state) {
    try {
      const decoded = JSON.parse(Buffer.from(state, "base64url").toString("utf-8"));
      clientId = decoded.cid;
      clientSecret = decoded.sec;
    } catch {
      // Ignore state parse errors
    }
  }

  const creds = getStoredCredentials();
  clientId = clientId || creds.googleClientId || "";
  clientSecret = clientSecret || creds.googleClientSecret || "";
  const redirectUri = `${url.origin}/api/auth/google/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${url.origin}/settings?error=missing_credentials`);
  }

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error("Google token exchange error:", errText);
      return NextResponse.redirect(`${url.origin}/settings?error=exchange_failed`);
    }

    const tokens = await tokenRes.json();
    const accessToken = tokens.access_token;
    const refreshToken = tokens.refresh_token || creds.googleRefreshToken || "";

    saveStoredCredentials({
      googleClientId: clientId,
      googleClientSecret: clientSecret,
      googleAccessToken: accessToken,
      googleRefreshToken: refreshToken,
      googleTokenExpiry: Date.now() + (tokens.expires_in || 3600) * 1000,
    });

    const params = new URLSearchParams({
      connected: "google",
      at: accessToken,
      rt: refreshToken,
      cid: clientId,
      sec: clientSecret,
    });

    return NextResponse.redirect(`${url.origin}/settings?${params.toString()}`);
  } catch (err: any) {
    console.error("Google OAuth callback exception:", err);
    return NextResponse.redirect(`${url.origin}/settings?error=server_error`);
  }
}
