"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  Settings as SettingsIcon, 
  CheckCircle, 
  RefreshCw, 
  Trash2, 
  Download, 
  Sparkles, 
  ShieldCheck, 
  ExternalLink,
  Layers,
  GraduationCap,
  Calendar,
  CheckSquare,
  Key,
  AlertCircle,
  User,
  Briefcase,
  Plus,
  ChevronDown,
  Clock,
  BookOpen,
  Laptop
} from "lucide-react";
import { useNexusStore } from "@/lib/data/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AccountType, ConnectedAccount, GoogleServiceType } from "@/lib/types";

interface IntegrationStatus {
  google: {
    connected: boolean;
    accountCount: number;
    hasClientId: boolean;
    maskedClientId: string;
    hasClientSecret: boolean;
    maskedClientSecret: string;
    hasRefreshToken: boolean;
    maskedRefreshToken: string;
    hasAccessToken: boolean;
    maskedAccessToken: string;
  };
  notion: {
    connected: boolean;
    hasApiKey: boolean;
    maskedApiKey: string;
    hasDatabaseId: boolean;
    maskedDatabaseId: string;
  };
  connectedAccounts?: ConnectedAccount[];
}

export default function SettingsPage() {
  const {
    integrations,
    connectedAccounts,
    syncAll,
    isSyncing,
    disconnectAccount,
    updateAccount,
    purgeDemoData,
    resetToDemo,
    disconnectNotion,
    mode,
    setMode,
    isLiveSynced,
  } = useNexusStore();
  
  // Credentials state for manual configuration
  const [googleClientId, setGoogleClientId] = useState("");
  const [googleClientSecret, setGoogleClientSecret] = useState("");
  const [googleRefreshToken, setGoogleRefreshToken] = useState("");
  const [googleAccessToken, setGoogleAccessToken] = useState("");
  
  const [notionApiKey, setNotionApiKey] = useState("");
  const [notionDatabaseId, setNotionDatabaseId] = useState("");

  const [integrationStatus, setIntegrationStatus] = useState<IntegrationStatus | null>(null);
  const [activeConfigTab, setActiveConfigTab] = useState<"accounts" | "google" | "notion" | "extension">("accounts");
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [isGeneratingPairing, setIsGeneratingPairing] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [syncingAccountId, setSyncingAccountId] = useState<string | null>(null);
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [newAccountType, setNewAccountType] = useState<AccountType>("personal");

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/integrations/status");
      if (res.ok) {
        const data: IntegrationStatus = await res.json();
        setIntegrationStatus(data);
      }
    } catch (err) {
      console.error("Error fetching status:", err);
    }
  }, []);

  // Handle URL query parameters upon returning from OAuth
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam === "accounts" || tabParam === "google" || tabParam === "notion") {
        setActiveConfigTab(tabParam as any);
      }

      if (params.get("connected") === "google") {
        const accountEmail = params.get("account");
        const accountType = params.get("type");
        window.history.replaceState({}, document.title, window.location.pathname);
        setStatusMsg(`✓ Google Account (${accountEmail || "New account"}${accountType ? ` as ${accountType}` : ""}) connected successfully! Syncing live items...`);
        fetchStatus();
        syncAll();
      } else if (params.get("error")) {
        const err = params.get("error");
        if (err === "missing_credentials" || err === "missing_client_secret") {
          setErrorMsg("Google Client Secret is required to connect. Please configure your Google Client ID & Secret below.");
          setActiveConfigTab("google");
        } else if (err === "missing_client_id") {
          setErrorMsg("Google Client ID is required. Please configure your Client ID below.");
          setActiveConfigTab("google");
        } else {
          setErrorMsg(`OAuth connection issue: ${err}`);
        }
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }

    fetchStatus();
  }, [fetchStatus, syncAll]);

  const handleSaveGoogle = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMsg("");
    setErrorMsg("");

    const updatedCreds: Record<string, string | undefined> = {};
    if (googleClientId.trim()) updatedCreds.googleClientId = googleClientId.trim();
    if (googleClientSecret.trim()) updatedCreds.googleClientSecret = googleClientSecret.trim();
    if (googleRefreshToken.trim()) updatedCreds.googleRefreshToken = googleRefreshToken.trim();
    if (googleAccessToken.trim()) updatedCreds.googleAccessToken = googleAccessToken.trim();

    try {
      const res = await fetch("/api/integrations/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedCreds),
      });

      const data = await res.json();
      if (data.success) {
        setGoogleClientId("");
        setGoogleClientSecret("");
        setGoogleRefreshToken("");
        setGoogleAccessToken("");

        setStatusMsg("Google credentials saved securely on server! Syncing live data...");
        await fetchStatus();
        await syncAll();
        setStatusMsg("Google integration configured and ready!");
        setActiveConfigTab("accounts");
      } else {
        setErrorMsg(data.error || "Failed to save Google credentials");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveNotion = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMsg("");
    setErrorMsg("");

    const updatedCreds: Record<string, string | undefined> = {};
    if (notionApiKey.trim()) updatedCreds.notionApiKey = notionApiKey.trim();
    if (notionDatabaseId.trim()) updatedCreds.notionDatabaseId = notionDatabaseId.trim();

    try {
      const res = await fetch("/api/integrations/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedCreds),
      });

      const data = await res.json();
      if (data.success) {
        setNotionApiKey("");
        setNotionDatabaseId("");

        setStatusMsg("Notion credentials saved securely on server! Syncing live data...");
        await fetchStatus();
        await syncAll();
        setStatusMsg("Notion project database connected and synced!");
        setActiveConfigTab("accounts");
      } else {
        setErrorMsg(data.error || "Failed to save Notion credentials");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTriggerSyncAll = async () => {
    setSyncFeedback("Syncing all connected Google accounts & Notion...");
    try {
      await syncAll();
      await fetchStatus();
      setSyncFeedback("Sync complete. All connected accounts are up to date.");
    } catch (err: any) {
      setSyncFeedback(`Sync notice: ${err.message}`);
    }
    setTimeout(() => setSyncFeedback(null), 5000);
  };

  const handleSyncSingleAccount = async (accountId: string, email: string) => {
    setSyncingAccountId(accountId);
    setSyncFeedback(`Syncing account: ${email}...`);
    try {
      await syncAll(accountId);
      await fetchStatus();
      setSyncFeedback(`Account ${email} synced successfully.`);
    } catch (err: any) {
      setSyncFeedback(`Sync failed for ${email}: ${err.message}`);
    } finally {
      setSyncingAccountId(null);
      setTimeout(() => setSyncFeedback(null), 4000);
    }
  };

  const handleStartOAuth = (type: AccountType) => {
    setShowAddAccountModal(false);
    window.location.href = `/api/auth/google?account_type=${encodeURIComponent(type)}`;
  };

  const handleToggleService = async (account: ConnectedAccount, service: GoogleServiceType) => {
    const currentServices = account.services || ["calendar", "tasks"];
    const isEnabled = currentServices.includes(service);
    const updatedServices: GoogleServiceType[] = isEnabled
      ? currentServices.filter((s: GoogleServiceType) => s !== service)
      : [...currentServices, service];

    await updateAccount(account.id, { services: updatedServices });
    await fetchStatus();
  };

  const handleExportData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(
      JSON.stringify(localStorage, null, 2)
    );
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `nexus_export_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    setStatusMsg("Data exported successfully!");
    setTimeout(() => setStatusMsg(""), 3000);
  };

  const handlePurgeDemoData = () => {
    if (confirm("Remove sample demo items and display only real connected account data?")) {
      purgeDemoData();
      setStatusMsg("Demo items purged! Displaying connected accounts only.");
      setTimeout(() => setStatusMsg(""), 4000);
    }
  };

  const handleResetDemo = () => {
    if (confirm("Reset NEXUS to initial clean demo state?")) {
      resetToDemo();
      setStatusMsg("Reset to demo data!");
      setTimeout(() => setStatusMsg(""), 3000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-8 animate-fade-in text-ink">
      {/* Header */}
      <div className="border-b border-hairline pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-olive" />
            <h1 className="text-2xl font-serif font-semibold tracking-tight text-ink">Accounts & Integrations</h1>
          </div>
          <p className="text-xs text-ink-muted mt-1">
            Connect and manage multiple Google accounts (Personal, University, Work) with independent scopes and token refresh
          </p>
        </div>

        {/* Live status badge */}
        <div className="flex items-center gap-2">
          {connectedAccounts.length > 0 ? (
            <Badge variant="olive" className="font-mono text-[11px] py-1">
              ● {connectedAccounts.length} Connected Account{connectedAccounts.length !== 1 ? "s" : ""}
            </Badge>
          ) : (
            <Badge variant="parchment" className="font-mono text-[11px] py-1">
              ○ No Accounts Connected
            </Badge>
          )}
        </div>
      </div>

      {/* Status Notifications */}
      {statusMsg && (
        <div className="p-3 rounded-lg bg-olive-light/30 border border-olive/30 text-ink text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-olive flex-shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 rounded-lg bg-canvas-secondary border border-terracotta/40 text-terracotta text-xs flex items-center gap-2 font-semibold">
          <AlertCircle className="w-4 h-4 text-terracotta flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {syncFeedback && (
        <div className="p-3 rounded-lg bg-olive-light/20 border border-olive/20 text-ink text-xs flex items-center gap-2 animate-pulse">
          <RefreshCw className="w-4 h-4 text-olive flex-shrink-0" />
          <span>{syncFeedback}</span>
        </div>
      )}

      {/* Main Settings Card */}
      <div className="p-6 rounded-xl border border-hairline bg-surface space-y-6">
        {/* Navigation Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-hairline">
          <div className="flex items-center gap-2 bg-canvas-secondary p-1 rounded-lg border border-hairline text-xs">
            <button
              onClick={() => setActiveConfigTab("accounts")}
              className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 ${
                activeConfigTab === "accounts" 
                  ? "bg-surface text-ink font-semibold shadow-xs" 
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Connected Accounts ({connectedAccounts.length})</span>
            </button>

            <button
              onClick={() => setActiveConfigTab("google")}
              className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 ${
                activeConfigTab === "google" 
                  ? "bg-surface text-ink font-semibold shadow-xs" 
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              <span>Google API Keys</span>
            </button>

            <button
              onClick={() => setActiveConfigTab("notion")}
              className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 ${
                activeConfigTab === "notion" 
                  ? "bg-surface text-ink font-semibold shadow-xs" 
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Notion</span>
            </button>

            <button
              onClick={() => setActiveConfigTab("extension")}
              className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 ${
                activeConfigTab === "extension" 
                  ? "bg-surface text-ink font-semibold shadow-xs" 
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              <Laptop className="w-3.5 h-3.5" />
              <span>Classroom Extension</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleTriggerSyncAll}
              disabled={isSyncing}
              className="text-xs h-8 flex items-center gap-1.5 bg-olive hover:bg-olive-hover text-white font-medium shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
              <span>Sync All Accounts</span>
            </Button>
          </div>
        </div>

        {/* TAB 1: CONNECTED ACCOUNTS */}
        {activeConfigTab === "accounts" && (
          <div className="space-y-6">
            {/* Top Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-canvas-secondary/50 p-3.5 rounded-lg border border-hairline">
              <div>
                <h3 className="font-semibold text-xs text-ink">Multi-Account Google Workspace</h3>
                <p className="text-[11px] text-ink-muted mt-0.5">
                  Connect personal and university Google accounts. Each account maintains isolated refresh tokens.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  size="sm"
                  onClick={() => setShowAddAccountModal(true)}
                  className="bg-olive hover:bg-olive-hover text-white text-xs h-8 flex items-center gap-1.5 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Google Account</span>
                </Button>
              </div>
            </div>

            {/* List of Connected Accounts */}
            {connectedAccounts.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {connectedAccounts.map((account) => {
                  const isPersonal = account.accountType === "personal";
                  const isUniversity = account.accountType === "university";
                  const isWork = account.accountType === "work";
                  const isReauth = account.status === "reauth_required";
                  const services = account.services || ["calendar", "tasks"];

                  return (
                    <div 
                      key={account.id} 
                      className={`p-4 rounded-xl border transition-all bg-surface ${
                        isReauth ? "border-amber-500/50 bg-amber-500/[0.02]" : "border-hairline hover:border-hairline-darker"
                      }`}
                    >
                      {/* Account Card Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-hairline">
                        <div className="flex items-start gap-3">
                          <div className={`p-2.5 rounded-lg border shrink-0 ${
                            isUniversity 
                              ? "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20" 
                              : isWork
                              ? "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20"
                              : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                          }`}>
                            {isUniversity ? (
                              <GraduationCap className="w-5 h-5" />
                            ) : isWork ? (
                              <Briefcase className="w-5 h-5" />
                            ) : (
                              <User className="w-5 h-5" />
                            )}
                          </div>

                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-semibold text-sm text-ink">{account.displayName || account.email}</h4>
                              
                              {/* Account Classification Badge */}
                              <span className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase font-bold ${
                                isUniversity
                                  ? "bg-purple-500/15 text-purple-800 dark:text-purple-300 border-purple-500/30"
                                  : isWork
                                  ? "bg-blue-500/15 text-blue-800 dark:text-blue-300 border-blue-500/30"
                                  : "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30"
                              }`}>
                                {account.accountType}
                              </span>

                              {account.isDefault && (
                                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-canvas-secondary text-ink-muted border border-hairline">
                                  DEFAULT
                                </span>
                              )}

                              {/* Status Badge */}
                              {isReauth ? (
                                <Badge variant="terracotta" className="text-[10px]">
                                  ⚠ Re-auth Required
                                </Badge>
                              ) : (
                                <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  Active
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-ink-muted font-mono mt-0.5">{account.email}</p>
                          </div>
                        </div>

                        {/* Top-Right Account Actions */}
                        <div className="flex items-center gap-2 self-end sm:self-center">
                          {isReauth ? (
                            <button
                              type="button"
                              onClick={() => handleStartOAuth(account.accountType)}
                              className="px-2.5 py-1.5 rounded-md bg-amber-500 hover:bg-amber-600 text-white font-medium text-xs flex items-center gap-1 shadow-xs"
                            >
                              <RefreshCw className="w-3 h-3" />
                              <span>Re-authenticate</span>
                            </button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={syncingAccountId === account.id}
                              onClick={() => handleSyncSingleAccount(account.id, account.email)}
                              className="text-xs h-7 border-hairline hover:border-olive/50 text-ink-secondary hover:text-ink flex items-center gap-1"
                            >
                              <RefreshCw className={`w-3 h-3 ${syncingAccountId === account.id ? "animate-spin" : ""}`} />
                              <span>Sync</span>
                            </Button>
                          )}

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              if (confirm(`Disconnect account ${account.email}? Synced calendar and task items from this account will be removed.`)) {
                                await disconnectAccount(account.id);
                                setStatusMsg(`Account ${account.email} disconnected.`);
                                setTimeout(() => setStatusMsg(""), 3000);
                              }
                            }}
                            className="text-xs h-7 text-terracotta hover:bg-terracotta/10 hover:text-terracotta px-2"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Account Card Configuration Body */}
                      <div className="pt-3 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        {/* Account Classification Selector */}
                        <div className="space-y-1">
                          <label className="text-ink-secondary font-medium text-[11px]">
                            Account Classification
                          </label>
                          <select
                            value={account.accountType}
                            onChange={async (e) => {
                              const newType = e.target.value as AccountType;
                              await updateAccount(account.id, { accountType: newType });
                              setStatusMsg(`Updated classification for ${account.email} to ${newType}.`);
                              setTimeout(() => setStatusMsg(""), 3000);
                            }}
                            className="w-full bg-canvas border border-hairline rounded-md p-1.5 text-xs text-ink outline-none focus:border-olive"
                          >
                            <option value="personal">Personal Account</option>
                            <option value="university">University / Academic</option>
                            <option value="work">Work Account</option>
                            <option value="other">Other Account</option>
                          </select>
                        </div>

                        {/* Enabled Services Checkboxes */}
                        <div className="space-y-1">
                          <label className="text-ink-secondary font-medium text-[11px]">
                            Enabled Services
                          </label>
                          <div className="flex flex-wrap items-center gap-2 pt-0.5">
                            {/* Calendar */}
                            <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none bg-canvas-secondary px-2 py-1 rounded border border-hairline hover:border-hairline-darker">
                              <input
                                type="checkbox"
                                checked={services.includes("calendar")}
                                onChange={() => handleToggleService(account, "calendar")}
                                className="accent-olive rounded"
                              />
                              <Calendar className="w-3 h-3 text-olive" />
                              <span>Calendar</span>
                            </label>

                            {/* Tasks */}
                            <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none bg-canvas-secondary px-2 py-1 rounded border border-hairline hover:border-hairline-darker">
                              <input
                                type="checkbox"
                                checked={services.includes("tasks")}
                                onChange={() => handleToggleService(account, "tasks")}
                                className="accent-olive rounded"
                              />
                              <CheckSquare className="w-3 h-3 text-olive" />
                              <span>Tasks</span>
                            </label>

                            {/* Classroom */}
                            <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none bg-canvas-secondary px-2 py-1 rounded border border-hairline hover:border-hairline-darker">
                              <input
                                type="checkbox"
                                checked={services.includes("classroom")}
                                onChange={() => handleToggleService(account, "classroom")}
                                className="accent-olive rounded"
                              />
                              <BookOpen className="w-3 h-3 text-purple-600" />
                              <span>Classroom</span>
                            </label>
                          </div>
                        </div>
                      </div>

                      {/* Error Banner if any */}
                      {account.lastErrorMessage && (
                        <div className="mt-3 p-2 rounded bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{account.lastErrorMessage}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center rounded-xl border border-dashed border-hairline space-y-3">
                <div className="w-10 h-10 rounded-full bg-olive-light/20 text-olive flex items-center justify-center mx-auto">
                  <User className="w-5 h-5" />
                </div>
                <h4 className="font-semibold text-sm text-ink">No Google accounts connected</h4>
                <p className="text-xs text-ink-muted max-w-md mx-auto">
                  Connect your Personal and University Google accounts to bring tasks, course assignments, and calendar events into one command center.
                </p>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <Button
                    onClick={() => setShowAddAccountModal(true)}
                    className="bg-olive hover:bg-olive-hover text-white text-xs h-8"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    Connect First Google Account
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CONFIGURE GOOGLE API KEYS */}
        {activeConfigTab === "google" && (
          <form onSubmit={handleSaveGoogle} className="space-y-4 text-xs">
            <div className="p-3.5 rounded-lg bg-canvas border border-hairline text-ink-secondary space-y-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-olive" />
                <span className="font-semibold text-ink">Shared Google OAuth App Credentials</span>
              </div>
              <p className="text-[11px] text-ink-muted leading-relaxed">
                Provide your Google Cloud Console OAuth 2.0 Client credentials once. All connected Google accounts (Personal, University, etc.) will authenticate securely using these credentials.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-ink font-medium">Google Client ID</label>
                  {integrationStatus?.google?.hasClientId && (
                    <div className="flex items-center gap-1 text-[10px] text-olive font-medium">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Configured</span>
                    </div>
                  )}
                </div>
                <input
                  type="text"
                  value={googleClientId}
                  onChange={(e) => setGoogleClientId(e.target.value)}
                  placeholder={integrationStatus?.google?.maskedClientId || "e.g. 123456789-xyz.apps.googleusercontent.com"}
                  className="w-full bg-canvas border border-hairline rounded-lg p-2.5 text-ink placeholder-ink-muted outline-none focus:border-olive font-mono text-xs"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-ink font-medium">Google Client Secret</label>
                  {integrationStatus?.google?.hasClientSecret && (
                    <div className="flex items-center gap-1 text-[10px] text-olive font-medium">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Configured & Masked</span>
                    </div>
                  )}
                </div>
                <input
                  type="password"
                  value={googleClientSecret}
                  onChange={(e) => setGoogleClientSecret(e.target.value)}
                  placeholder={integrationStatus?.google?.maskedClientSecret || "GOCSPX-••••••••••••••••"}
                  className="w-full bg-canvas border border-hairline rounded-lg p-2.5 text-ink placeholder-ink-muted outline-none focus:border-olive font-mono text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-hairline">
              <Button variant="ghost" size="sm" type="button" onClick={() => setActiveConfigTab("accounts")}>
                Back to Accounts
              </Button>
              <Button size="sm" type="submit" disabled={isSaving} className="bg-olive hover:bg-olive-hover text-white font-medium">
                {isSaving ? "Saving..." : "Save Credentials"}
              </Button>
            </div>
          </form>
        )}

        {/* TAB 3: CONFIGURE NOTION */}
        {activeConfigTab === "notion" && (
          <form onSubmit={handleSaveNotion} className="space-y-4 text-xs">
            <div className="p-3.5 rounded-lg bg-canvas border border-hairline text-ink-secondary space-y-1">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-olive" />
                <span className="font-semibold text-ink">Notion Projects Database Integration</span>
              </div>
              <p className="text-[11px] text-ink-muted leading-relaxed">
                Connect your internal Notion integration token and target database ID to synchronize projects and notes.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-ink font-medium">Internal Integration Secret</label>
                <input
                  type="password"
                  value={notionApiKey}
                  onChange={(e) => setNotionApiKey(e.target.value)}
                  placeholder={integrationStatus?.notion?.maskedApiKey || "secret_••••••••••••••••"}
                  className="w-full bg-canvas border border-hairline rounded-lg p-2.5 text-ink placeholder-ink-muted outline-none focus:border-olive font-mono text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-ink font-medium">Database ID</label>
                <input
                  type="text"
                  value={notionDatabaseId}
                  onChange={(e) => setNotionDatabaseId(e.target.value)}
                  placeholder={integrationStatus?.notion?.maskedDatabaseId || "e.g. 2969f64c053f4c63bf1829e0689b91e9"}
                  className="w-full bg-canvas border border-hairline rounded-lg p-2.5 text-ink placeholder-ink-muted outline-none focus:border-olive font-mono text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-hairline">
              <Button variant="ghost" size="sm" type="button" onClick={() => setActiveConfigTab("accounts")}>
                Cancel
              </Button>
              <Button size="sm" type="submit" disabled={isSaving} className="bg-olive hover:bg-olive-hover text-white font-medium">
                {isSaving ? "Saving..." : "Save Notion Credentials"}
              </Button>
            </div>
          </form>
        )}

        {/* TAB 4: CONFIGURE BROWSER EXTENSION */}
        {activeConfigTab === "extension" && (
          <div className="space-y-6 text-xs">
            <div className="p-4 rounded-lg bg-canvas border border-hairline text-ink-secondary space-y-1.5">
              <div className="flex items-center gap-2">
                <Laptop className="w-4 h-4 text-olive" />
                <span className="font-semibold text-ink">NEXUS Academic Capture Extension (Chrome Manifest V3)</span>
              </div>
              <p className="text-[11px] text-ink-muted leading-relaxed">
                Capture visible assignments, lecture notes, syllabus documents, and exam notifications directly from Google Classroom using temporary scoped device pairing.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-hairline bg-surface space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-hairline pb-4">
                <div>
                  <h4 className="font-semibold text-ink text-sm">Device Authentication</h4>
                  <p className="text-xs text-ink-muted mt-0.5">
                    Generate a secure 6-digit code to pair your browser extension without storing Google credentials.
                  </p>
                </div>

                <Button
                  size="sm"
                  disabled={isGeneratingPairing}
                  onClick={async () => {
                    setIsGeneratingPairing(true);
                    try {
                      const res = await fetch("/api/extension/pair");
                      if (res.ok) {
                        const data = await res.json();
                        setPairingCode(data.pairingCode);
                        setStatusMsg("Temporary 6-digit pairing code generated.");
                        setTimeout(() => setStatusMsg(""), 5000);
                      }
                    } catch (e) {
                      setErrorMsg("Failed to generate pairing code.");
                    } finally {
                      setIsGeneratingPairing(false);
                    }
                  }}
                  className="bg-olive hover:bg-olive-hover text-white text-xs h-8 shrink-0 flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generate 6-Digit Pairing Code</span>
                </Button>
              </div>

              {pairingCode && (
                <div className="p-5 rounded-lg bg-canvas border border-hairline text-center space-y-1 animate-fade-in">
                  <span className="text-[11px] font-mono text-ink-muted uppercase tracking-wider">
                    Extension Authentication Code
                  </span>
                  <div className="text-3xl font-mono font-bold text-olive tracking-widest py-1">
                    {pairingCode}
                  </div>
                  <span className="text-[10px] font-mono text-ink-muted block">
                    Valid for 15 minutes · Enter into your Chrome Extension popup
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3 rounded-lg border border-hairline bg-canvas/40 space-y-1">
                  <span className="font-mono text-[10px] text-olive font-semibold uppercase">Step 1</span>
                  <p className="font-medium text-ink text-xs">Install Extension</p>
                  <p className="text-[11px] text-ink-muted">Load the unpackaged extension located in the <code>/extension</code> folder via Chrome Extension Developer Mode.</p>
                </div>
                <div className="p-3 rounded-lg border border-hairline bg-canvas/40 space-y-1">
                  <span className="font-mono text-[10px] text-olive font-semibold uppercase">Step 2</span>
                  <p className="font-medium text-ink text-xs">Pair Device</p>
                  <p className="text-[11px] text-ink-muted">Enter the 6-digit code into the extension popup while keeping NEXUS open on <code>localhost:3000</code>.</p>
                </div>
                <div className="p-3 rounded-lg border border-hairline bg-canvas/40 space-y-1">
                  <span className="font-mono text-[10px] text-olive font-semibold uppercase">Step 3</span>
                  <p className="font-medium text-ink text-xs">Capture & Classify</p>
                  <p className="text-[11px] text-ink-muted">Navigate to any Google Classroom course, assignment, or announcement, and click "Send to NEXUS".</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Account Classification Choice Modal */}
      {showAddAccountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/30 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface border border-hairline rounded-xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div>
              <h3 className="font-serif font-semibold text-base text-ink">Connect Google Account</h3>
              <p className="text-xs text-ink-muted mt-1">
                How would you like to classify this Google account in your workspace?
              </p>
            </div>

            <div className="space-y-2">
              <label 
                onClick={() => setNewAccountType("personal")}
                className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                  newAccountType === "personal" 
                    ? "border-olive bg-olive/5 shadow-xs" 
                    : "border-hairline hover:border-hairline-darker bg-canvas"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-md bg-emerald-500/10 text-emerald-600">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-xs text-ink">Personal Account</p>
                    <p className="text-[11px] text-ink-muted">Personal calendar commitments, life tasks, health & bills</p>
                  </div>
                </div>
                <input
                  type="radio"
                  name="account_type"
                  checked={newAccountType === "personal"}
                  onChange={() => setNewAccountType("personal")}
                  className="accent-olive"
                />
              </label>

              <label 
                onClick={() => setNewAccountType("university")}
                className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                  newAccountType === "university" 
                    ? "border-olive bg-olive/5 shadow-xs" 
                    : "border-hairline hover:border-hairline-darker bg-canvas"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-md bg-purple-500/10 text-purple-600">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-xs text-ink">University / Student Account</p>
                    <p className="text-[11px] text-ink-muted">Google Classroom assignments, exam schedules & coursework</p>
                  </div>
                </div>
                <input
                  type="radio"
                  name="account_type"
                  checked={newAccountType === "university"}
                  onChange={() => setNewAccountType("university")}
                  className="accent-olive"
                />
              </label>

              <label 
                onClick={() => setNewAccountType("work")}
                className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                  newAccountType === "work" 
                    ? "border-olive bg-olive/5 shadow-xs" 
                    : "border-hairline hover:border-hairline-darker bg-canvas"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-md bg-blue-500/10 text-blue-600">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-xs text-ink">Work / Project Account</p>
                    <p className="text-[11px] text-ink-muted">Work calendar meetings, project deliverable tracking</p>
                  </div>
                </div>
                <input
                  type="radio"
                  name="account_type"
                  checked={newAccountType === "work"}
                  onChange={() => setNewAccountType("work")}
                  className="accent-olive"
                />
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-hairline">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAddAccountModal(false)}
                className="text-xs"
              >
                Cancel
              </Button>

              <Button
                size="sm"
                onClick={() => handleStartOAuth(newAccountType)}
                className="bg-olive hover:bg-olive-hover text-white text-xs font-medium"
              >
                <span>Continue to Google</span>
                <ExternalLink className="w-3 h-3 ml-1.5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Section 2: Productivity Preferences */}
      <div className="p-6 rounded-xl border border-hairline bg-surface space-y-4">
        <h2 className="text-sm font-serif font-semibold text-ink">Productivity Preferences</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1.5">
            <label className="text-ink-secondary font-medium">Default Working Mode</label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as any)}
              className="w-full bg-canvas border border-hairline rounded-lg p-2 text-ink outline-none focus:border-olive"
            >
              <option value="default">Default Mode (Balanced Command Center)</option>
              <option value="exam">Exam Mode (Academic Deadlines Prioritized)</option>
              <option value="build">Build Mode (Sprint Tasks & GitHub Prioritized)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-ink-secondary font-medium">Default Focus Session Length</label>
            <select
              defaultValue="45"
              className="w-full bg-canvas border border-hairline rounded-lg p-2 text-ink outline-none focus:border-olive"
            >
              <option value="25">25 minutes (Pomodoro)</option>
              <option value="45">45 minutes (Deep Work)</option>
              <option value="60">60 minutes (Sprint)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Section 3: Data Management & Demo Reset */}
      <div className="p-6 rounded-xl border border-hairline bg-surface space-y-4">
        <h2 className="text-sm font-serif font-semibold text-ink">Data & Cache Management</h2>
        <p className="text-xs text-ink-muted leading-relaxed">
          NEXUS operates with instant local persistence and two-way sync with your connected Google accounts.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Button variant="outline" size="sm" onClick={handleExportData} className="text-xs h-8 border-hairline text-ink-secondary hover:text-ink hover:bg-canvas-secondary">
            <Download className="w-3.5 h-3.5 mr-1.5 text-olive" />
            Export Local Data (JSON)
          </Button>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={handlePurgeDemoData} 
            className="text-xs h-8 border-hairline text-ink-secondary hover:text-ink hover:bg-canvas-secondary"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5 text-ink-muted" />
            Purge Demo Items
          </Button>

          <Button variant="danger" size="sm" onClick={handleResetDemo} className="text-xs h-8">
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            Reset to Clean Demo State
          </Button>
        </div>
      </div>
    </div>
  );
}
