import { NextResponse } from "next/server";
import { 
  getStoredCredentials, 
  getConnectedGoogleAccounts, 
  updateGoogleAccount, 
  removeGoogleAccount,
  saveGoogleAccount,
  attachCredentialsCookie
} from "@/lib/integrations/config";
import { GoogleServiceType, AccountType } from "@/lib/types";

export async function GET() {
  const creds = getStoredCredentials();
  const accounts = getConnectedGoogleAccounts(creds).map((acc) => ({
    id: acc.id,
    provider: acc.provider,
    providerAccountId: acc.providerAccountId,
    email: acc.email,
    displayName: acc.displayName,
    avatarUrl: acc.avatarUrl,
    accountType: acc.accountType,
    status: acc.status,
    isDefault: Boolean(acc.isDefault),
    services: acc.services || ["calendar", "tasks"],
    connectedAt: acc.connectedAt,
    lastUsedAt: acc.lastUsedAt,
    lastErrorMessage: acc.lastErrorMessage,
  }));

  return NextResponse.json({ accounts });
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { accountId, accountType, displayName, isDefault, services } = body;

    if (!accountId) {
      return NextResponse.json({ success: false, error: "Missing accountId" }, { status: 400 });
    }

    const updates: any = {};
    if (accountType && ["personal", "university", "work", "other"].includes(accountType)) {
      updates.accountType = accountType as AccountType;
    }
    if (typeof displayName === "string" && displayName.trim()) {
      updates.displayName = displayName.trim();
    }
    if (typeof isDefault === "boolean") {
      updates.isDefault = isDefault;
    }
    if (Array.isArray(services)) {
      updates.services = services as GoogleServiceType[];
    }

    const updatedCreds = updateGoogleAccount(accountId, updates);

    // Return sanitized accounts
    const accounts = getConnectedGoogleAccounts(updatedCreds).map((acc) => ({
      id: acc.id,
      provider: acc.provider,
      providerAccountId: acc.providerAccountId,
      email: acc.email,
      displayName: acc.displayName,
      avatarUrl: acc.avatarUrl,
      accountType: acc.accountType,
      status: acc.status,
      isDefault: Boolean(acc.isDefault),
      services: acc.services || ["calendar", "tasks"],
      connectedAt: acc.connectedAt,
      lastUsedAt: acc.lastUsedAt,
      lastErrorMessage: acc.lastErrorMessage,
    }));

    const res = NextResponse.json({ success: true, accounts });
    return attachCredentialsCookie(res, updatedCreds);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const accountId = url.searchParams.get("accountId");

    if (!accountId) {
      return NextResponse.json({ success: false, error: "Missing accountId parameter" }, { status: 400 });
    }

    const updatedCreds = removeGoogleAccount(accountId);

    const accounts = getConnectedGoogleAccounts(updatedCreds).map((acc) => ({
      id: acc.id,
      provider: acc.provider,
      providerAccountId: acc.providerAccountId,
      email: acc.email,
      displayName: acc.displayName,
      avatarUrl: acc.avatarUrl,
      accountType: acc.accountType,
      status: acc.status,
      isDefault: Boolean(acc.isDefault),
      services: acc.services || ["calendar", "tasks"],
      connectedAt: acc.connectedAt,
      lastUsedAt: acc.lastUsedAt,
      lastErrorMessage: acc.lastErrorMessage,
    }));

    const res = NextResponse.json({ 
      success: true, 
      message: `Account ${accountId} disconnected`, 
      accounts 
    });
    return attachCredentialsCookie(res, updatedCreds);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// POST endpoint for account management actions
export async function POST(req: Request) {
  try {
    const body = await req.json();

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
