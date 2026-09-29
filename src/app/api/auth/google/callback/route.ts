import { NextResponse } from "next/server";
import { 
  getStoredCredentials, 
  saveStoredCredentials, 
  attachCredentialsCookie, 
  saveGoogleAccount,
  getConnectedGoogleAccounts
} from "@/lib/integrations/config";
import { AccountType } from "@/lib/types";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const state = url.searchParams.get("state");

  if (error) {
    return NextResponse.redirect(`${url.origin}/settings?tab=accounts&error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return NextResponse.redirect(`${url.origin}/settings?tab=accounts&error=no_code_provided`);
  }

  let clientId = "";
  let accountType: AccountType = "personal";

  if (state) {
    try {
      const decoded = JSON.parse(Buffer.from(state, "base64url").toString("utf-8"));
      clientId = decoded.cid || "";
      if (decoded.accountType && ["personal", "university", "work", "other"].includes(decoded.accountType)) {
        accountType = decoded.accountType as AccountType;
      }
    } catch {
      // Ignore state parse errors
    }
  }

  const creds = getStoredCredentials();
  clientId = clientId || creds.googleClientId || process.env.GOOGLE_CLIENT_ID || "";
  const clientSecret = creds.googleClientSecret || process.env.GOOGLE_CLIENT_SECRET || "";
  const redirectUri = `${url.origin}/api/auth/google/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${url.origin}/settings?tab=accounts&error=missing_credentials`);
  }

  try {
    // 1. Exchange authorization code for tokens
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
      return NextResponse.redirect(`${url.origin}/settings?tab=accounts&error=exchange_failed`);
    }

    const tokens = await tokenRes.json();
    const accessToken = tokens.access_token;
    const refreshToken = tokens.refresh_token || "";
    const tokenExpiry = Date.now() + (tokens.expires_in || 3600) * 1000;

    // 2. Resolve Google Account Identity
    let providerAccountId = "";
    let email = "";
    let displayName = "Google User";
    let avatarUrl: string | undefined = undefined;

    try {
      const userinfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (userinfoRes.ok) {
        const userInfo = await userinfoRes.json();
        providerAccountId = userInfo.sub || "";
        email = userInfo.email || "";
        displayName = userInfo.name || email.split("@")[0] || "Google User";
        avatarUrl = userInfo.picture;
      }
    } catch (uErr) {
      console.warn("Failed to fetch Google userinfo:", uErr);
    }

    // Gracefully handle missing email
    if (!email) {
      email = `google_user_${Date.now()}@google.account`;
    }

    // Auto-detect university account type if not explicitly set and email matches academic domain
    if (accountType === "personal" && (email.includes(".edu") || email.includes(".ac.") || email.includes("student."))) {
      accountType = "university";
    }

    const existingAccounts = getConnectedGoogleAccounts(creds);
    const isFirstAccount = existingAccounts.length === 0;

    // Stable account id based on providerAccountId or normalized email
    const accountId = providerAccountId ? `google-${providerAccountId}` : `google-${email.replace(/[^a-zA-Z0-9]/g, "_")}`;

    // 3. Save Connected Account in multi-account store
    const updatedCreds = saveGoogleAccount({
      id: accountId,
      providerAccountId: providerAccountId || accountId,
      email,
      displayName,
      avatarUrl,
      accountType,
      status: "active",
      isDefault: isFirstAccount,
      refreshToken,
      accessToken,
      tokenExpiry,
      clientId,
      clientSecret,
      services: accountType === "university" 
        ? ["calendar", "classroom", "drive", "tasks"]
        : ["calendar", "tasks", "drive"],
      connectedAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
    });

    // Also update top-level legacy credentials for backward compatibility
    saveStoredCredentials({
      googleClientId: clientId,
      googleClientSecret: clientSecret,
      googleAccessToken: accessToken,
      googleRefreshToken: refreshToken || creds.googleRefreshToken,
      googleTokenExpiry: tokenExpiry,
    });

    // Redirect to Settings with success indicators and account details
    const targetUrl = new URL(`${url.origin}/settings`);
    targetUrl.searchParams.set("tab", "accounts");
    targetUrl.searchParams.set("connected", "google");
    targetUrl.searchParams.set("account", email);
    targetUrl.searchParams.set("type", accountType);

    const response = NextResponse.redirect(targetUrl.toString());
    return attachCredentialsCookie(response, updatedCreds);
  } catch (err: any) {
    console.error("Google OAuth callback exception:", err);
    return NextResponse.redirect(`${url.origin}/settings?tab=accounts&error=server_error`);
  }
}
