import { NextResponse } from "next/server";
import { saveStoredCredentials, getStoredCredentials } from "@/lib/integrations/config";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const updated = saveStoredCredentials(body);

    return NextResponse.json({
      success: true,
      message: "Credentials saved successfully",
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
