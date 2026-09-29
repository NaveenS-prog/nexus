import { NextResponse } from "next/server";
import { generatePairingCode, pairWithCode } from "@/lib/academic/storage";

// GET: Generate a new 6-digit pairing code for the user to enter into the browser extension
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const deviceName = searchParams.get("deviceName") || "Chrome Browser Extension";
    const userId = searchParams.get("userId") || "user_default";

    const pairing = await generatePairingCode(userId, deviceName);

    return NextResponse.json({
      success: true,
      pairingCode: pairing.pairingCode,
      expiresAt: pairing.expiresAt,
      instructions: "Enter this 6-digit code into your NEXUS Chrome Extension to authenticate securely.",
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// POST: Browser extension submits pairing code to claim and activate the auth token
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { pairingCode, deviceName } = body;

    if (!pairingCode) {
      return NextResponse.json(
        { success: false, error: "Pairing code is required." },
        { status: 400 }
      );
    }

    const result = await pairWithCode(
      pairingCode,
      deviceName || "Chrome Browser Extension"
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || "Pairing failed." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      token: result.token,
      message: "Extension paired successfully with NEXUS.",
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
