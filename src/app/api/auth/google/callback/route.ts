import { NextResponse } from "next/server";
import { getStoredCredentials, saveStoredCredentials } from "@/lib/integrations/config";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(`${url.origin}/settings?error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return NextResponse.redirect(`${url.origin}/settings?error=no_code_provided`);
  }

  const creds = getStoredCredentials();
  const clientId = creds.googleClientId;
  const clientSecret = creds.googleClientSecret;
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
    saveStoredCredentials({
      googleAccessToken: tokens.access_token,
      googleRefreshToken: tokens.refresh_token || creds.googleRefreshToken,
      googleTokenExpiry: Date.now() + (tokens.expires_in || 3600) * 1000,
    });

    return NextResponse.redirect(`${url.origin}/settings?connected=google`);
  } catch (err: any) {
    console.error("Google OAuth callback exception:", err);
    return NextResponse.redirect(`${url.origin}/settings?error=server_error`);
  }
}
