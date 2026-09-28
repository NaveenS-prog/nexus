import { NextResponse } from "next/server";
import {
  saveStoredCredentials,
  clearGoogleCredentials,
  clearNotionCredentials,
  attachCredentialsCookie,
  clearCredentialsCookie,
  IntegrationCredentials,
} from "@/lib/integrations/config";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (body.action === "disconnect_google") {
      const remaining = clearGoogleCredentials();
      const res = NextResponse.json({
        success: true,
        message: "Google Account disconnected successfully",
        googleConfigured: false,
      });
      return attachCredentialsCookie(res, remaining);
    }

    if (body.action === "disconnect_notion") {
      const remaining = clearNotionCredentials();
      const res = NextResponse.json({
        success: true,
        message: "Notion disconnected successfully",
        notionConfigured: false,
      });
      return attachCredentialsCookie(res, remaining);
    }

    // Build partial update payload without overwriting existing secrets if empty
    const toUpdate: Partial<IntegrationCredentials> = {};

    if (typeof body.googleClientId === "string" && body.googleClientId.trim() !== "") {
      toUpdate.googleClientId = body.googleClientId.trim();
    } else if (body.clearGoogleClientId) {
      toUpdate.googleClientId = "";
    }

    if (typeof body.googleClientSecret === "string" && body.googleClientSecret.trim() !== "") {
      toUpdate.googleClientSecret = body.googleClientSecret.trim();
    } else if (body.clearGoogleClientSecret) {
      toUpdate.googleClientSecret = "";
    }

    if (typeof body.googleRefreshToken === "string" && body.googleRefreshToken.trim() !== "") {
      toUpdate.googleRefreshToken = body.googleRefreshToken.trim();
    } else if (body.clearGoogleRefreshToken) {
      toUpdate.googleRefreshToken = "";
    }

    if (typeof body.googleAccessToken === "string" && body.googleAccessToken.trim() !== "") {
      toUpdate.googleAccessToken = body.googleAccessToken.trim();
    } else if (body.clearGoogleAccessToken) {
      toUpdate.googleAccessToken = "";
    }

    if (typeof body.notionApiKey === "string" && body.notionApiKey.trim() !== "") {
      toUpdate.notionApiKey = body.notionApiKey.trim();
    } else if (body.clearNotionApiKey) {
      toUpdate.notionApiKey = "";
    }

    if (typeof body.notionDatabaseId === "string" && body.notionDatabaseId.trim() !== "") {
      toUpdate.notionDatabaseId = body.notionDatabaseId.trim();
    } else if (body.clearNotionDatabaseId) {
      toUpdate.notionDatabaseId = "";
    }

    const updated = saveStoredCredentials(toUpdate);

    const res = NextResponse.json({
      success: true,
      message: "Credentials saved securely on server",
      googleConfigured: Boolean(
        updated.googleAccessToken || (updated.googleRefreshToken && updated.googleClientId)
      ),
      notionConfigured: Boolean(updated.notionApiKey && updated.notionDatabaseId),
    });

    return attachCredentialsCookie(res, updated);
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to save credentials" },
      { status: 500 }
    );
  }
}

