import { NextResponse } from "next/server";
import {
  saveStoredCredentials,
  clearGoogleCredentials,
  clearNotionCredentials,
  IntegrationCredentials,
} from "@/lib/integrations/config";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (body.action === "disconnect_google") {
      clearGoogleCredentials();
      return NextResponse.json({
        success: true,
        message: "Google Account disconnected successfully",
        googleConfigured: false,
      });
    }

    if (body.action === "disconnect_notion") {
      clearNotionCredentials();
      return NextResponse.json({
        success: true,
        message: "Notion disconnected successfully",
        notionConfigured: false,
      });
    }

    // Build partial update payload without overwriting existing secrets if empty
    const toUpdate: Partial<IntegrationCredentials> = {};

    if (typeof body.googleClientId === "string") {
      toUpdate.googleClientId = body.googleClientId.trim();
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

    if (typeof body.notionDatabaseId === "string") {
      toUpdate.notionDatabaseId = body.notionDatabaseId.trim();
    }

    const updated = saveStoredCredentials(toUpdate);

    return NextResponse.json({
      success: true,
      message: "Credentials saved securely on server",
      googleConfigured: Boolean(
        updated.googleAccessToken || (updated.googleRefreshToken && updated.googleClientId)
      ),
      notionConfigured: Boolean(updated.notionApiKey && updated.notionDatabaseId),
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to save credentials" },
      { status: 500 }
    );
  }
}

