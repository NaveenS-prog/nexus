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
  GitBranch,
  Key,
  AlertCircle,
  HelpCircle
} from "lucide-react";
import { useNexusStore } from "@/lib/data/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface IntegrationStatus {
  google: {
    connected: boolean;
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
}

export default function SettingsPage() {
  const {
    integrations,
    syncAll,
    isSyncing,
    purgeDemoData,
    resetToDemo,
    disconnectGoogle,
    disconnectNotion,
    mode,
    setMode,
    isLiveSynced,
  } = useNexusStore();
  
  // Credentials state (write-only for sensitive secrets and identifiers)
  const [googleClientId, setGoogleClientId] = useState("");
  const [googleClientSecret, setGoogleClientSecret] = useState("");
  const [googleRefreshToken, setGoogleRefreshToken] = useState("");
  const [googleAccessToken, setGoogleAccessToken] = useState("");
  
  const [notionApiKey, setNotionApiKey] = useState("");
  const [notionDatabaseId, setNotionDatabaseId] = useState("");

  const [integrationStatus, setIntegrationStatus] = useState<IntegrationStatus | null>(null);
  const [activeConfigTab, setActiveConfigTab] = useState<"overview" | "google" | "notion">("overview");
  const [statusMsg, setStatusMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

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

  // Handle initial mount, legacy secret purge, and OAuth callback return
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("nexus_credentials_v1");
      if (saved) {
        try {
          const creds = JSON.parse(saved);
          // If legacy plaintext secrets exist in browser storage, migrate them safely to server once, then purge
          if (creds.googleClientSecret || creds.googleRefreshToken || creds.googleAccessToken || creds.notionApiKey) {
            fetch("/api/integrations/save", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                googleClientId: creds.googleClientId,
                googleClientSecret: creds.googleClientSecret,
                googleRefreshToken: creds.googleRefreshToken,
                googleAccessToken: creds.googleAccessToken,
                notionApiKey: creds.notionApiKey,
                notionDatabaseId: creds.notionDatabaseId,
              }),
            })
              .then(() => fetchStatus())
              .catch(() => {});

            // Permanently purge sensitive secrets from browser DOM/storage
            delete creds.googleClientSecret;
            delete creds.googleRefreshToken;
            delete creds.googleAccessToken;
            delete creds.notionApiKey;
            localStorage.setItem("nexus_credentials_v1", JSON.stringify(creds));
          }
        } catch {
          // ignore
        }
      }

      const params = new URLSearchParams(window.location.search);
      if (params.get("connected") === "google") {
        // Clear query parameters from URL address bar without reloading
        window.history.replaceState({}, document.title, window.location.pathname);
        setStatusMsg("Google Account connected successfully via OAuth! Syncing live data...");
        fetchStatus();
        syncAll();
      } else if (params.get("error")) {
        setErrorMsg(`OAuth connection issue: ${params.get("error")}`);
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
        // Clear sensitive inputs from memory immediately
        setGoogleClientId("");
        setGoogleClientSecret("");
        setGoogleRefreshToken("");
        setGoogleAccessToken("");

        setStatusMsg("Google credentials saved securely on server! Syncing live data...");
        await fetchStatus();
        await syncAll();
        setStatusMsg("Google Calendar & Tasks connected and synced!");
        setActiveConfigTab("overview");
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
        // Clear inputs from memory
        setNotionApiKey("");
        setNotionDatabaseId("");

        setStatusMsg("Notion credentials saved securely on server! Syncing live data...");
        await fetchStatus();
        await syncAll();
        setStatusMsg("Notion project database connected and synced!");
        setActiveConfigTab("overview");
      } else {
        setErrorMsg(data.error || "Failed to save Notion credentials");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTriggerLiveSync = async () => {
    setSyncFeedback("Syncing with Google Calendar, Google Tasks & Notion...");
    try {
      const res = await fetch("/api/integrations/sync", { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.items && data.items.length > 0) {
        await syncAll();
        setSyncFeedback(
          `Success! Imported ${data.stats.googleCalendar} Calendar events, ${data.stats.googleTasks} Google Tasks, and ${data.stats.notion} Notion items.`
        );
      } else if (data.errors && data.errors.length > 0) {
        setSyncFeedback(`Notice: ${data.errors.join(", ")}`);
      } else {
        setSyncFeedback("Sync complete. Up-to-date with upstream accounts.");
      }
    } catch (err: any) {
      setSyncFeedback(`Sync failed: ${err.message}`);
    }
    setTimeout(() => setSyncFeedback(null), 7000);
  };

  const handlePurgeDemoData = () => {
    if (confirm("Remove all sample demo items and display only your connected Google and Notion items?")) {
      purgeDemoData();
      setStatusMsg("Sample demo items purged! Displaying live data only.");
      setTimeout(() => setStatusMsg(""), 4000);
    }
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

  const handleResetDemo = () => {
    if (confirm("Reset NEXUS to initial sample demo data?")) {
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
            <h1 className="text-2xl font-serif font-semibold tracking-tight text-ink">Integrations & Settings</h1>
          </div>
          <p className="text-xs text-ink-muted mt-1">
            Connect your live Google Calendar, Google Tasks, and Notion accounts
          </p>
        </div>

        {/* Live status badge */}
        <div className="flex items-center gap-2">
          {isLiveSynced ? (
            <Badge variant="olive" className="font-mono text-[11px] py-1">
              ● Live Data Synced
            </Badge>
          ) : (
            <Badge variant="parchment" className="font-mono text-[11px] py-1">
              ○ Demo Mode Active
            </Badge>
          )}
        </div>
      </div>

      {/* Notifications */}
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

      {/* Integration Configuration Tabs */}
      <div className="p-6 rounded-xl border border-hairline bg-surface space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-hairline">
          <div className="flex items-center gap-2 bg-canvas-secondary p-1 rounded-lg border border-hairline text-xs">
            <button
              onClick={() => setActiveConfigTab("overview")}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                activeConfigTab === "overview" ? "bg-surface text-ink font-semibold shadow-xs" : "text-ink-muted hover:text-ink"
              }`}
            >
              Overview & Status
            </button>
            <button
              onClick={() => setActiveConfigTab("google")}
              className={`px-3 py-1 rounded-md font-medium transition-all flex items-center gap-1.5 ${
                activeConfigTab === "google" ? "bg-surface text-ink font-semibold shadow-xs" : "text-ink-muted hover:text-ink"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Configure Google</span>
            </button>
            <button
              onClick={() => setActiveConfigTab("notion")}
              className={`px-3 py-1 rounded-md font-medium transition-all flex items-center gap-1.5 ${
                activeConfigTab === "notion" ? "bg-surface text-ink font-semibold shadow-xs" : "text-ink-muted hover:text-ink"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Configure Notion</span>
            </button>
          </div>

          <Button
            size="sm"
            onClick={handleTriggerLiveSync}
            disabled={isSyncing}
            className="text-xs h-8 flex items-center gap-1.5 bg-olive hover:bg-olive-hover text-white font-medium shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
            <span>Sync Live Accounts Now</span>
          </Button>
        </div>

        {/* Tab 1: Overview */}
        {activeConfigTab === "overview" && (
          <div className="space-y-4">
            <div className="divide-y divide-hairline">
              {/* Google Integration Card */}
              <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-lg bg-canvas-secondary border border-hairline text-olive">
                    <Calendar className="w-5 h-5 text-olive" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-serif font-semibold text-sm text-ink">Google Calendar & Tasks</h3>
                      <Badge variant="outline">Tasks + Calendar</Badge>
                    </div>
                    <p className="text-ink-secondary mt-0.5 text-xs">
                      Synchronizes scheduled lecture blocks, personal Google Tasks, and daily calendar commitments.
                    </p>
                    <p className="text-[10px] text-ink-muted mt-1 font-mono">
                      Scopes: tasks, calendar.readonly, calendar.events
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 self-end sm:self-center">
                  {(googleClientId || integrationStatus?.google?.hasClientId) && (
                    <button
                      type="button"
                      onClick={() => {
                        window.location.href = "/api/auth/google";
                      }}
                      className="px-3 py-1.5 rounded-md bg-olive hover:bg-olive-hover text-white font-medium transition-colors flex items-center gap-1.5 text-xs shadow-xs"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>{integrationStatus?.google?.connected ? "Switch Account" : "Connect Google"}</span>
                    </button>
                  )}
                  <Button
                    onClick={() => setActiveConfigTab("google")}
                    variant="outline"
                    size="sm"
                    className="text-xs h-8 border-hairline hover:border-olive/50 text-ink-secondary hover:text-ink"
                  >
                    <Key className="w-3.5 h-3.5 mr-1.5 text-olive" />
                    {integrationStatus?.google?.connected ? "Manage Keys" : "Manual Keys"}
                  </Button>
                </div>
              </div>

              {/* Notion Integration Card */}
              <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-lg bg-canvas-secondary border border-hairline text-olive">
                    <Layers className="w-5 h-5 text-olive" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-serif font-semibold text-sm text-ink">Notion Projects & Ideas</h3>
                      <Badge variant="outline">Sprint Database</Badge>
                    </div>
                    <p className="text-ink-secondary mt-0.5 text-xs">
                      Queries your Notion projects database, stages, tags, and automatically appends brain-dumped ideas.
                    </p>
                    <p className="text-[10px] text-ink-muted mt-1 font-mono">
                      Uses Internal Integration Token + Database ID
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 self-end sm:self-center">
                  <Button
                    onClick={() => setActiveConfigTab("notion")}
                    variant="outline"
                    size="sm"
                    className="text-xs h-8 border-hairline hover:border-olive/50 text-ink-secondary hover:text-ink"
                  >
                    <Key className="w-3.5 h-3.5 mr-1.5 text-olive" />
                    {integrationStatus?.notion?.connected ? "Manage Notion Keys" : "Enter Notion Keys"}
                  </Button>
                </div>
              </div>

              {/* Google Classroom (Marked for Later) */}
              <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs opacity-70">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-lg bg-canvas-secondary border border-hairline text-ink-muted">
                    <GraduationCap className="w-5 h-5 text-ink-muted" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-serif font-semibold text-sm text-ink-secondary">Google Classroom</h3>
                      <Badge variant="parchment">Scheduled for Later</Badge>
                    </div>
                    <p className="text-ink-muted mt-0.5 text-xs">
                      Coursework and assignments currently simulated with realistic demo data.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Configure Google */}
        {activeConfigTab === "google" && (
          <form onSubmit={handleSaveGoogle} className="space-y-4 text-xs">
            <div className="p-3.5 rounded-lg bg-canvas border border-hairline text-ink-secondary space-y-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-olive" />
                <span className="font-semibold text-ink">Google Calendar & Tasks Setup</span>
              </div>
              <p className="text-[11px] text-ink-muted leading-relaxed">
                Credentials and tokens are stored write-only on the secure server. Secrets are never exposed in browser DOM or inspect tools.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-ink font-medium">Google Client ID</label>
                  {integrationStatus?.google?.hasClientId && (
                    <div className="flex items-center gap-1 text-[10px] text-olive font-medium">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Configured & Masked</span>
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
                <p className="text-[10px] text-ink-muted">
                  {integrationStatus?.google?.hasClientId
                    ? "Masked for privacy. Leave blank to retain current ID, or enter new to update."
                    : "OAuth public client identifier from your Google Cloud Console."}
                </p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-ink font-medium">Google Client Secret</label>
                  {integrationStatus?.google?.hasClientSecret && (
                    <div className="flex items-center gap-1 text-[10px] text-olive font-medium">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Configured & Secured</span>
                    </div>
                  )}
                </div>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={googleClientSecret}
                  onChange={(e) => setGoogleClientSecret(e.target.value)}
                  placeholder={integrationStatus?.google?.maskedClientSecret || "GOCSPX-..."}
                  className="w-full bg-canvas border border-hairline rounded-lg p-2.5 text-ink placeholder-ink-muted outline-none focus:border-olive font-mono text-xs"
                />
                <p className="text-[10px] text-ink-muted">
                  {integrationStatus?.google?.hasClientSecret
                    ? "Stored securely server-side. Leave blank to keep existing secret, or enter new to rotate."
                    : "Write-only. Stored securely on server and never inspectable in client DOM."}
                </p>
              </div>

              <div className="space-y-1 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <label className="text-ink font-medium">Google Refresh Token (Auto-refresh & background sync)</label>
                  {integrationStatus?.google?.hasRefreshToken && (
                    <div className="flex items-center gap-1 text-[10px] text-olive font-medium">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Configured & Secured</span>
                    </div>
                  )}
                </div>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={googleRefreshToken}
                  onChange={(e) => setGoogleRefreshToken(e.target.value)}
                  placeholder={integrationStatus?.google?.maskedRefreshToken || "1//04... (or connect via OAuth button below)"}
                  className="w-full bg-canvas border border-hairline rounded-lg p-2.5 text-ink placeholder-ink-muted outline-none focus:border-olive font-mono text-xs"
                />
                <p className="text-[10px] text-ink-muted">
                  {integrationStatus?.google?.hasRefreshToken
                    ? "Stored securely on server. Leave blank to retain current token."
                    : "Obtained automatically via one-click OAuth below, or can be pasted manually."}
                </p>
              </div>

              <div className="space-y-1 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <label className="text-ink font-medium">Direct Access Token (Optional temporary token)</label>
                  {integrationStatus?.google?.hasAccessToken && (
                    <div className="flex items-center gap-1 text-[10px] text-olive font-medium">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Active Session Token</span>
                    </div>
                  )}
                </div>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={googleAccessToken}
                  onChange={(e) => setGoogleAccessToken(e.target.value)}
                  placeholder={integrationStatus?.google?.maskedAccessToken || "ya29.a0A..."}
                  className="w-full bg-canvas border border-hairline rounded-lg p-2.5 text-ink placeholder-ink-muted outline-none focus:border-olive font-mono text-xs"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-hairline">
              <div className="flex flex-wrap items-center gap-2">
                {(googleClientId || integrationStatus?.google?.hasClientId) && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (googleClientId.trim() || googleClientSecret.trim()) {
                        setIsSaving(true);
                        try {
                          await fetch("/api/integrations/save", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              googleClientId: googleClientId.trim() || undefined,
                              googleClientSecret: googleClientSecret.trim() || undefined,
                            }),
                          });
                          setGoogleClientSecret("");
                        } catch (err) {
                          console.error("Save error:", err);
                        } finally {
                          setIsSaving(false);
                        }
                      }
                      window.location.href = "/api/auth/google";
                    }}
                    className="px-4 py-2 rounded-md bg-olive hover:bg-olive-hover text-white font-medium transition-colors flex items-center gap-2 text-xs shadow-xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>{integrationStatus?.google?.connected ? "Switch / Reconnect Google (OAuth)" : "Connect with Google Account (OAuth)"}</span>
                  </button>
                )}

                {(integrationStatus?.google?.connected || googleRefreshToken || googleAccessToken) && (
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={async () => {
                      if (confirm("Disconnect Google Account and remove all synced calendar items from this device?")) {
                        await disconnectGoogle();
                        setGoogleAccessToken("");
                        setGoogleRefreshToken("");
                        setGoogleClientSecret("");
                        await fetchStatus();
                        setStatusMsg("Google Account disconnected and calendar events cleared.");
                        setTimeout(() => setStatusMsg(""), 4000);
                      }
                    }}
                    className="text-xs h-8"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                    <span>Disconnect Google</span>
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <Button variant="ghost" size="sm" type="button" onClick={() => setActiveConfigTab("overview")}>
                  Cancel
                </Button>
                <Button size="sm" type="submit" disabled={isSaving} className="bg-olive hover:bg-olive-hover text-white font-medium">
                  {isSaving ? "Saving & Syncing..." : "Save Google Credentials & Sync"}
                </Button>
              </div>
            </div>
          </form>
        )}

        {/* Tab 3: Configure Notion */}
        {activeConfigTab === "notion" && (
          <form onSubmit={handleSaveNotion} className="space-y-4 text-xs">
            <div className="p-3.5 rounded-lg bg-canvas border border-hairline text-ink-secondary space-y-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-olive" />
                <span className="font-semibold text-ink">Notion Integration Setup</span>
              </div>
              <p className="text-[11px] text-ink-muted leading-relaxed">
                Create an internal integration at <a href="https://www.notion.so/my-integrations" target="_blank" rel="noreferrer" className="underline text-olive">notion.so/my-integrations</a>, then share your Projects database with it. Secrets are stored securely write-only on the server.
              </p>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-ink font-medium">Notion API Key (Internal Integration Secret)</label>
                  {integrationStatus?.notion?.hasApiKey && (
                    <div className="flex items-center gap-1 text-[10px] text-olive font-medium">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Configured & Secured</span>
                    </div>
                  )}
                </div>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={notionApiKey}
                  onChange={(e) => setNotionApiKey(e.target.value)}
                  placeholder={integrationStatus?.notion?.maskedApiKey || "secret_..."}
                  className="w-full bg-canvas border border-hairline rounded-lg p-2.5 text-ink placeholder-ink-muted outline-none focus:border-olive font-mono text-xs"
                />
                <p className="text-[10px] text-ink-muted">
                  {integrationStatus?.notion?.hasApiKey
                    ? "Stored securely server-side. Leave blank to keep existing key, or enter a new key to rotate."
                    : "Write-only. Stored securely on server and never inspectable in client DOM."}
                </p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-ink font-medium">Notion Database ID</label>
                  {integrationStatus?.notion?.hasDatabaseId && (
                    <div className="flex items-center gap-1 text-[10px] text-olive font-medium">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Configured & Masked</span>
                    </div>
                  )}
                </div>
                <input
                  type="text"
                  value={notionDatabaseId}
                  onChange={(e) => setNotionDatabaseId(e.target.value)}
                  placeholder={integrationStatus?.notion?.maskedDatabaseId || "e.g. 2969f64c053f4c63bf1829e0689b91e9"}
                  className="w-full bg-canvas border border-hairline rounded-lg p-2.5 text-ink placeholder-ink-muted outline-none focus:border-olive font-mono text-xs"
                />
                <p className="text-[10px] text-ink-muted">
                  {integrationStatus?.notion?.hasDatabaseId
                    ? "Masked for privacy. Leave blank to keep existing database ID, or enter new to update."
                    : "Find this in your Notion database link: notion.so/workspace/[database_id]?v=..."}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-3 border-t border-hairline">
              <div>
                {integrationStatus?.notion?.connected && (
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={async () => {
                      if (confirm("Disconnect Notion and remove synced project items?")) {
                        await disconnectNotion();
                        setNotionApiKey("");
                        setNotionDatabaseId("");
                        await fetchStatus();
                        setStatusMsg("Notion disconnected successfully.");
                        setTimeout(() => setStatusMsg(""), 4000);
                      }
                    }}
                    className="text-xs h-8"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                    <span>Disconnect Notion</span>
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" type="button" onClick={() => setActiveConfigTab("overview")}>
                  Cancel
                </Button>
                <Button size="sm" type="submit" disabled={isSaving} className="bg-olive hover:bg-olive-hover text-white font-medium">
                  {isSaving ? "Saving & Syncing..." : "Save Notion Credentials & Sync"}
                </Button>
              </div>
            </div>
          </form>
        )}
      </div>

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
          NEXUS operates with instant local persistence. You can toggle back to clean demo data at any time or export all your synced data as JSON.
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
            Purge Demo Items (Live Data Only)
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

