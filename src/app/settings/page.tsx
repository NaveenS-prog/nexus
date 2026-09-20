"use client";

import { useState, useEffect } from "react";
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

export default function SettingsPage() {
  const { integrations, syncAll, isSyncing, resetToDemo, mode, setMode, isLiveSynced } = useNexusStore();
  
  // Credentials state
  const [googleClientId, setGoogleClientId] = useState("");
  const [googleClientSecret, setGoogleClientSecret] = useState("");
  const [googleRefreshToken, setGoogleRefreshToken] = useState("");
  const [googleAccessToken, setGoogleAccessToken] = useState("");
  
  const [notionApiKey, setNotionApiKey] = useState("");
  const [notionDatabaseId, setNotionDatabaseId] = useState("");

  const [activeConfigTab, setActiveConfigTab] = useState<"overview" | "google" | "notion">("overview");
  const [statusMsg, setStatusMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Check URL params for OAuth callback return
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("connected") === "google") {
        setStatusMsg("Google Account connected successfully via OAuth!");
        syncAll();
      } else if (params.get("error")) {
        setErrorMsg(`OAuth connection issue: ${params.get("error")}`);
      }
    }
  }, [syncAll]);

  // Load status
  useEffect(() => {
    fetch("/api/integrations/status")
      .then((res) => res.json())
      .then((data) => {
        // Can be used to set status flags
      })
      .catch((err) => console.error("Error fetching status:", err));
  }, []);

  const handleSaveGoogle = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMsg("");
    setErrorMsg("");

    try {
      const res = await fetch("/api/integrations/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          googleClientId: googleClientId.trim() || undefined,
          googleClientSecret: googleClientSecret.trim() || undefined,
          googleRefreshToken: googleRefreshToken.trim() || undefined,
          googleAccessToken: googleAccessToken.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setStatusMsg("Google credentials saved! Testing live sync...");
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

    try {
      const res = await fetch("/api/integrations/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notionApiKey: notionApiKey.trim() || undefined,
          notionDatabaseId: notionDatabaseId.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setStatusMsg("Notion credentials saved! Testing live sync...");
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
      const res = await fetch("/api/integrations/sync", { method: "POST" });
      const data = await res.json();
      if (data.items && data.items.length > 0) {
        await syncAll();
        setSyncFeedback(
          `Success! Imported ${data.stats.googleCalendar} Calendar events, ${data.stats.googleTasks} Google Tasks, and ${data.stats.notion} Notion items.`
        );
      } else if (data.errors && data.errors.length > 0) {
        setSyncFeedback(`Notice: ${data.errors.join(", ")}`);
      } else {
        setSyncFeedback("Sync complete. No new items found in upstream accounts.");
      }
    } catch (err: any) {
      setSyncFeedback(`Sync failed: ${err.message}`);
    }
    setTimeout(() => setSyncFeedback(null), 7000);
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
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="border-b border-white/[0.06] pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-indigo-400" />
            <h1 className="text-2xl font-bold tracking-tight text-white">Integrations & Settings</h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Connect your live Google Calendar, Google Tasks, and Notion accounts
          </p>
        </div>

        {/* Live status badge */}
        <div className="flex items-center gap-2">
          {isLiveSynced ? (
            <Badge variant="success" className="font-mono text-[11px] py-1">
              ● Live Data Synced
            </Badge>
          ) : (
            <Badge variant="secondary" className="font-mono text-[11px] py-1">
              ○ Demo Mode Active
            </Badge>
          )}
        </div>
      </div>

      {/* Notifications */}
      {statusMsg && (
        <div className="p-3 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {syncFeedback && (
        <div className="p-3 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs flex items-center gap-2 animate-pulse">
          <RefreshCw className="w-4 h-4 text-indigo-400 flex-shrink-0" />
          <span>{syncFeedback}</span>
        </div>
      )}

      {/* Integration Configuration Tabs */}
      <div className="p-5 rounded-xl border border-white/[0.08] bg-nexus-900/50 backdrop-blur-sm space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-2 bg-nexus-950 p-1 rounded-lg border border-white/[0.06] text-xs">
            <button
              onClick={() => setActiveConfigTab("overview")}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                activeConfigTab === "overview" ? "bg-white/[0.1] text-white" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Overview & Status
            </button>
            <button
              onClick={() => setActiveConfigTab("google")}
              className={`px-3 py-1 rounded-md font-medium transition-all flex items-center gap-1.5 ${
                activeConfigTab === "google" ? "bg-indigo-600 text-white" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Configure Google</span>
            </button>
            <button
              onClick={() => setActiveConfigTab("notion")}
              className={`px-3 py-1 rounded-md font-medium transition-all flex items-center gap-1.5 ${
                activeConfigTab === "notion" ? "bg-indigo-600 text-white" : "text-zinc-400 hover:text-zinc-200"
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
            className="text-xs h-8 flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
            <span>Sync Live Accounts Now</span>
          </Button>
        </div>

        {/* Tab 1: Overview */}
        {activeConfigTab === "overview" && (
          <div className="space-y-4">
            <div className="divide-y divide-white/[0.04]">
              {/* Google Integration Card */}
              <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-lg bg-nexus-950 border border-white/[0.06] text-zinc-300">
                    <Calendar className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm text-zinc-100">Google Calendar & Tasks</h3>
                      <Badge variant="cyan">Tasks + Calendar</Badge>
                    </div>
                    <p className="text-zinc-400 mt-0.5 text-xs">
                      Synchronizes scheduled lecture blocks, personal Google Tasks, and daily calendar commitments.
                    </p>
                    <p className="text-[10px] text-zinc-500 mt-1 font-mono">
                      Scopes: tasks, calendar.readonly, calendar.events
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 self-end sm:self-center">
                  <Button
                    onClick={() => setActiveConfigTab("google")}
                    variant="outline"
                    size="sm"
                    className="text-xs h-8"
                  >
                    <Key className="w-3.5 h-3.5 mr-1.5" />
                    Enter Tokens / OAuth
                  </Button>
                </div>
              </div>

              {/* Notion Integration Card */}
              <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-lg bg-nexus-950 border border-white/[0.06] text-zinc-300">
                    <Layers className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm text-zinc-100">Notion Projects & Ideas</h3>
                      <Badge variant="warning">Sprint Database</Badge>
                    </div>
                    <p className="text-zinc-400 mt-0.5 text-xs">
                      Queries your Notion projects database, stages, tags, and automatically appends brain-dumped ideas.
                    </p>
                    <p className="text-[10px] text-zinc-500 mt-1 font-mono">
                      Uses Internal Integration Token + Database ID
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 self-end sm:self-center">
                  <Button
                    onClick={() => setActiveConfigTab("notion")}
                    variant="outline"
                    size="sm"
                    className="text-xs h-8"
                  >
                    <Key className="w-3.5 h-3.5 mr-1.5" />
                    Enter Notion Keys
                  </Button>
                </div>
              </div>

              {/* Google Classroom (Marked for Later) */}
              <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs opacity-60">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-lg bg-nexus-950 border border-white/[0.06] text-zinc-300">
                    <GraduationCap className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm text-zinc-300">Google Classroom</h3>
                      <Badge variant="secondary">Scheduled for Later</Badge>
                    </div>
                    <p className="text-zinc-500 mt-0.5 text-xs">
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
            <div className="p-3 rounded-lg bg-indigo-950/30 border border-indigo-500/20 text-indigo-300 space-y-1">
              <span className="font-bold">Google Calendar & Tasks Setup:</span>
              <p className="text-[11px] text-zinc-300 leading-relaxed">
                Enter your Google Cloud OAuth credentials below, or paste your existing Refresh Token / Access Token. If you have Client ID & Secret configured, you can also use the one-click Google OAuth button.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-zinc-300 font-medium">Google Client ID</label>
                <input
                  type="text"
                  value={googleClientId}
                  onChange={(e) => setGoogleClientId(e.target.value)}
                  placeholder="e.g. 123456789-xyz.apps.googleusercontent.com"
                  className="w-full bg-nexus-950 border border-white/[0.08] rounded-lg p-2.5 text-zinc-100 placeholder-zinc-600 outline-none focus:border-indigo-500/50 font-mono text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-300 font-medium">Google Client Secret</label>
                <input
                  type="password"
                  value={googleClientSecret}
                  onChange={(e) => setGoogleClientSecret(e.target.value)}
                  placeholder="GOCSPX-..."
                  className="w-full bg-nexus-950 border border-white/[0.08] rounded-lg p-2.5 text-zinc-100 placeholder-zinc-600 outline-none focus:border-indigo-500/50 font-mono text-xs"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-zinc-300 font-medium">Google Refresh Token (Recommended for auto-refresh)</label>
                <input
                  type="password"
                  value={googleRefreshToken}
                  onChange={(e) => setGoogleRefreshToken(e.target.value)}
                  placeholder="1//04xyz... (or click Connect with Google if Client ID is entered)"
                  className="w-full bg-nexus-950 border border-white/[0.08] rounded-lg p-2.5 text-zinc-100 placeholder-zinc-600 outline-none focus:border-indigo-500/50 font-mono text-xs"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-zinc-300 font-medium">Direct Access Token (Optional temporary token)</label>
                <input
                  type="password"
                  value={googleAccessToken}
                  onChange={(e) => setGoogleAccessToken(e.target.value)}
                  placeholder="ya29.a0A..."
                  className="w-full bg-nexus-950 border border-white/[0.08] rounded-lg p-2.5 text-zinc-100 placeholder-zinc-600 outline-none focus:border-indigo-500/50 font-mono text-xs"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/[0.06]">
              {googleClientId && (
                <a
                  href="/api/auth/google"
                  className="px-4 py-2 rounded-md bg-white/[0.08] hover:bg-white/[0.14] text-zinc-200 font-medium transition-colors flex items-center gap-2 text-xs border border-white/[0.1]"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Connect with Google Account (OAuth)</span>
                </a>
              )}

              <div className="flex items-center gap-2 ml-auto">
                <Button variant="ghost" size="sm" type="button" onClick={() => setActiveConfigTab("overview")}>
                  Cancel
                </Button>
                <Button size="sm" type="submit" disabled={isSaving}>
                  {isSaving ? "Saving & Syncing..." : "Save Google Credentials & Sync"}
                </Button>
              </div>
            </div>
          </form>
        )}

        {/* Tab 3: Configure Notion */}
        {activeConfigTab === "notion" && (
          <form onSubmit={handleSaveNotion} className="space-y-4 text-xs">
            <div className="p-3 rounded-lg bg-indigo-950/30 border border-indigo-500/20 text-indigo-300 space-y-1">
              <span className="font-bold">Notion Integration Setup:</span>
              <p className="text-[11px] text-zinc-300 leading-relaxed">
                Create an internal integration at <a href="https://www.notion.so/my-integrations" target="_blank" rel="noreferrer" className="underline text-indigo-400">notion.so/my-integrations</a>, then share your Projects database with it.
              </p>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-zinc-300 font-medium">Notion API Key (Internal Integration Secret)</label>
                <input
                  type="password"
                  value={notionApiKey}
                  onChange={(e) => setNotionApiKey(e.target.value)}
                  placeholder="secret_..."
                  className="w-full bg-nexus-950 border border-white/[0.08] rounded-lg p-2.5 text-zinc-100 placeholder-zinc-600 outline-none focus:border-indigo-500/50 font-mono text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-300 font-medium">Notion Database ID</label>
                <input
                  type="text"
                  value={notionDatabaseId}
                  onChange={(e) => setNotionDatabaseId(e.target.value)}
                  placeholder="e.g. 2969f64c053f4c63bf1829e0689b91e9"
                  className="w-full bg-nexus-950 border border-white/[0.08] rounded-lg p-2.5 text-zinc-100 placeholder-zinc-600 outline-none focus:border-indigo-500/50 font-mono text-xs"
                />
                <p className="text-[10px] text-zinc-500">
                  Find this in your Notion database link: notion.so/workspace/<strong>[database_id]</strong>?v=...
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.06]">
              <Button variant="ghost" size="sm" type="button" onClick={() => setActiveConfigTab("overview")}>
                Cancel
              </Button>
              <Button size="sm" type="submit" disabled={isSaving}>
                {isSaving ? "Saving & Syncing..." : "Save Notion Credentials & Sync"}
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* Section 2: Productivity Preferences */}
      <div className="p-5 rounded-xl border border-white/[0.08] bg-nexus-900/50 backdrop-blur-sm space-y-4">
        <h2 className="text-sm font-semibold text-zinc-100">Productivity Preferences</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1.5">
            <label className="text-zinc-400 font-medium">Default Working Mode</label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as any)}
              className="w-full bg-nexus-950 border border-white/[0.08] rounded-lg p-2 text-zinc-200 outline-none"
            >
              <option value="default">Default Mode (Balanced Command Center)</option>
              <option value="exam">Exam Mode (Academic Deadlines Prioritized)</option>
              <option value="build">Build Mode (Sprint Tasks & GitHub Prioritized)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-zinc-400 font-medium">Default Focus Session Length</label>
            <select
              defaultValue="45"
              className="w-full bg-nexus-950 border border-white/[0.08] rounded-lg p-2 text-zinc-200 outline-none"
            >
              <option value="25">25 minutes (Pomodoro)</option>
              <option value="45">45 minutes (Deep Work)</option>
              <option value="60">60 minutes (Sprint)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Section 3: Data Management & Demo Reset */}
      <div className="p-5 rounded-xl border border-white/[0.08] bg-nexus-900/50 backdrop-blur-sm space-y-4">
        <h2 className="text-sm font-semibold text-zinc-100">Data & Cache Management</h2>
        <p className="text-xs text-zinc-400 leading-relaxed">
          NEXUS operates with instant local persistence. You can toggle back to clean demo data at any time or export all your synced data as JSON.
        </p>

        <div className="flex items-center gap-3 pt-2">
          <Button variant="outline" size="sm" onClick={handleExportData} className="text-xs h-8">
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Export Local Data (JSON)
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
