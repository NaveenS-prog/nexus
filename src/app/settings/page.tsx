"use client";

import { useState, useEffect } from "react";
import { 
  Settings as SettingsIcon, 
  CheckCircle, 
  RefreshCw, 
  Trash2, 
  Download, 
  ExternalLink,
  Layers,
  GraduationCap,
  Calendar,
  Key,
  AlertCircle
} from "lucide-react";
import { useNexusStore } from "@/lib/data/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function SettingsPage() {
  const { integrations, syncAll, isSyncing, purgeDemoData, resetToDemo, mode, setMode, isLiveSynced } = useNexusStore();
  
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

  // Load saved credentials on mount and handle OAuth callback return
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("nexus_credentials_v1");
      if (saved) {
        try {
          const creds = JSON.parse(saved);
          if (creds.googleClientId) setGoogleClientId(creds.googleClientId);
          if (creds.googleClientSecret) setGoogleClientSecret(creds.googleClientSecret);
          if (creds.googleRefreshToken) setGoogleRefreshToken(creds.googleRefreshToken);
          if (creds.googleAccessToken) setGoogleAccessToken(creds.googleAccessToken);
          if (creds.notionApiKey) setNotionApiKey(creds.notionApiKey);
          if (creds.notionDatabaseId) setNotionDatabaseId(creds.notionDatabaseId);
        } catch {
          // ignore
        }
      }

      const params = new URLSearchParams(window.location.search);
      if (params.get("connected") === "google") {
        const at = params.get("at");
        const rt = params.get("rt");
        const cid = params.get("cid");
        const sec = params.get("sec");

        const existingStr = localStorage.getItem("nexus_credentials_v1");
        const existing = existingStr ? JSON.parse(existingStr) : {};
        const updated = {
          ...existing,
          googleAccessToken: at || existing.googleAccessToken,
          googleRefreshToken: rt || existing.googleRefreshToken,
          googleClientId: cid || existing.googleClientId,
          googleClientSecret: sec || existing.googleClientSecret,
        };
        localStorage.setItem("nexus_credentials_v1", JSON.stringify(updated));

        setStatusMsg("Google Account connected successfully via OAuth! Syncing live data...");
        syncAll();
      } else if (params.get("error")) {
        setErrorMsg(`OAuth connection issue: ${params.get("error")}`);
      }
    }
  }, [syncAll]);

  const handleSaveGoogle = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMsg("");
    setErrorMsg("");

    const updatedCreds = {
      googleClientId: googleClientId.trim() || undefined,
      googleClientSecret: googleClientSecret.trim() || undefined,
      googleRefreshToken: googleRefreshToken.trim() || undefined,
      googleAccessToken: googleAccessToken.trim() || undefined,
    };

    if (typeof window !== "undefined") {
      const existingStr = localStorage.getItem("nexus_credentials_v1");
      const existing = existingStr ? JSON.parse(existingStr) : {};
      localStorage.setItem("nexus_credentials_v1", JSON.stringify({ ...existing, ...updatedCreds }));
    }

    try {
      const res = await fetch("/api/integrations/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedCreds),
      });

      const data = await res.json();
      if (data.success) {
        setStatusMsg("Google credentials saved! Initiating live calendar sync...");
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

    const updatedCreds = {
      notionApiKey: notionApiKey.trim() || undefined,
      notionDatabaseId: notionDatabaseId.trim() || undefined,
    };

    if (typeof window !== "undefined") {
      const existingStr = localStorage.getItem("nexus_credentials_v1");
      const existing = existingStr ? JSON.parse(existingStr) : {};
      localStorage.setItem("nexus_credentials_v1", JSON.stringify({ ...existing, ...updatedCreds }));
    }

    try {
      const res = await fetch("/api/integrations/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedCreds),
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
      let credsPayload = {};
      const saved = localStorage.getItem("nexus_credentials_v1");
      if (saved) {
        try {
          credsPayload = { credentials: JSON.parse(saved) };
        } catch {}
      }
      const res = await fetch("/api/integrations/sync", { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credsPayload),
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
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="border-b border-zinc-200/90 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-zinc-950" />
            <h1 className="text-2xl font-bold tracking-tight text-zinc-950">Integrations & Settings</h1>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Connect your live Google Calendar, Google Tasks, and Notion accounts
          </p>
        </div>

        {/* Live status badge */}
        <div className="flex items-center gap-2">
          {isLiveSynced ? (
            <Badge variant="default" className="font-mono text-[11px] py-1">
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
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-700 flex-shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2 font-medium">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {syncFeedback && (
        <div className="p-3 rounded-lg bg-zinc-100 border border-zinc-200 text-zinc-800 text-xs flex items-center gap-2 animate-pulse">
          <RefreshCw className="w-4 h-4 text-zinc-950 flex-shrink-0" />
          <span>{syncFeedback}</span>
        </div>
      )}

      {/* Integration Configuration Tabs */}
      <div className="p-5 rounded-xl border border-zinc-200/90 bg-white/90 backdrop-blur-md space-y-6 shadow-[0_1px_3px_rgba(0,0,0,0.03),0_8px_24px_rgba(0,0,0,0.02)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100">
          <div className="flex items-center gap-1.5 bg-zinc-100 p-1 rounded-lg border border-zinc-200 text-xs">
            <button
              onClick={() => setActiveConfigTab("overview")}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                activeConfigTab === "overview" ? "bg-white text-zinc-950 font-semibold shadow-xs border border-zinc-200/60" : "text-zinc-600 hover:text-zinc-950"
              }`}
            >
              Overview & Status
            </button>
            <button
              onClick={() => setActiveConfigTab("google")}
              className={`px-3 py-1 rounded-md font-medium transition-all flex items-center gap-1.5 ${
                activeConfigTab === "google" ? "bg-white text-zinc-950 font-semibold shadow-xs border border-zinc-200/60" : "text-zinc-600 hover:text-zinc-950"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Configure Google</span>
            </button>
            <button
              onClick={() => setActiveConfigTab("notion")}
              className={`px-3 py-1 rounded-md font-medium transition-all flex items-center gap-1.5 ${
                activeConfigTab === "notion" ? "bg-white text-zinc-950 font-semibold shadow-xs border border-zinc-200/60" : "text-zinc-600 hover:text-zinc-950"
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
            className="text-xs h-8 flex items-center gap-1.5 bg-zinc-950 text-white font-semibold hover:bg-zinc-800 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
            <span>Sync Live Accounts Now</span>
          </Button>
        </div>

        {/* Tab 1: Overview */}
        {activeConfigTab === "overview" && (
          <div className="space-y-4">
            <div className="divide-y divide-zinc-100">
              {/* Google Integration Card */}
              <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-950 shadow-2xs">
                    <Calendar className="w-5 h-5 text-zinc-950" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm text-zinc-950">Google Calendar & Tasks</h3>
                      <Badge variant="outline">Tasks + Calendar</Badge>
                    </div>
                    <p className="text-zinc-600 mt-0.5 text-xs">
                      Synchronizes scheduled lecture blocks, personal Google Tasks, and daily calendar commitments.
                    </p>
                    <p className="text-[10px] text-zinc-400 mt-1 font-mono">
                      Scopes: tasks, calendar.readonly, calendar.events
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 self-end sm:self-center">
                  <Button
                    onClick={() => setActiveConfigTab("google")}
                    variant="outline"
                    size="sm"
                    className="text-xs h-8 border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50"
                  >
                    <Key className="w-3.5 h-3.5 mr-1.5" />
                    Enter Tokens / OAuth
                  </Button>
                </div>
              </div>

              {/* Notion Integration Card */}
              <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-950 shadow-2xs">
                    <Layers className="w-5 h-5 text-zinc-950" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm text-zinc-950">Notion Projects & Ideas</h3>
                      <Badge variant="outline">Sprint Database</Badge>
                    </div>
                    <p className="text-zinc-600 mt-0.5 text-xs">
                      Queries your Notion projects database, stages, tags, and automatically appends brain-dumped ideas.
                    </p>
                    <p className="text-[10px] text-zinc-400 mt-1 font-mono">
                      Uses Internal Integration Token + Database ID
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 self-end sm:self-center">
                  <Button
                    onClick={() => setActiveConfigTab("notion")}
                    variant="outline"
                    size="sm"
                    className="text-xs h-8 border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50"
                  >
                    <Key className="w-3.5 h-3.5 mr-1.5" />
                    Enter Notion Keys
                  </Button>
                </div>
              </div>

              {/* Google Classroom */}
              <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs opacity-60">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-500">
                    <GraduationCap className="w-5 h-5 text-zinc-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm text-zinc-700">Google Classroom</h3>
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
            <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-800 space-y-1">
              <span className="font-bold">Google Calendar & Tasks Setup:</span>
              <p className="text-[11px] text-zinc-600 leading-relaxed">
                Enter your Google Cloud OAuth credentials below, or paste your existing Refresh Token / Access Token. If you have Client ID & Secret configured, you can also use the one-click Google OAuth button.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-zinc-700 font-medium">Google Client ID</label>
                <input
                  type="text"
                  value={googleClientId}
                  onChange={(e) => setGoogleClientId(e.target.value)}
                  placeholder="e.g. 123456789-xyz.apps.googleusercontent.com"
                  className="w-full bg-white border border-zinc-200 rounded-lg p-2.5 text-zinc-900 placeholder-zinc-400 outline-none focus:border-zinc-950 font-mono text-xs shadow-2xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-700 font-medium">Google Client Secret</label>
                <input
                  type="password"
                  value={googleClientSecret}
                  onChange={(e) => setGoogleClientSecret(e.target.value)}
                  placeholder="GOCSPX-..."
                  className="w-full bg-white border border-zinc-200 rounded-lg p-2.5 text-zinc-900 placeholder-zinc-400 outline-none focus:border-zinc-950 font-mono text-xs shadow-2xs"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-zinc-700 font-medium">Google Refresh Token (Recommended for auto-refresh)</label>
                <input
                  type="password"
                  value={googleRefreshToken}
                  onChange={(e) => setGoogleRefreshToken(e.target.value)}
                  placeholder="1//04xyz... (or click Connect with Google if Client ID is entered)"
                  className="w-full bg-white border border-zinc-200 rounded-lg p-2.5 text-zinc-900 placeholder-zinc-400 outline-none focus:border-zinc-950 font-mono text-xs shadow-2xs"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-zinc-700 font-medium">Direct Access Token (Optional temporary token)</label>
                <input
                  type="password"
                  value={googleAccessToken}
                  onChange={(e) => setGoogleAccessToken(e.target.value)}
                  placeholder="ya29.a0A..."
                  className="w-full bg-white border border-zinc-200 rounded-lg p-2.5 text-zinc-900 placeholder-zinc-400 outline-none focus:border-zinc-950 font-mono text-xs shadow-2xs"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-zinc-100">
              {googleClientId && (
                <a
                  href={`/api/auth/google?client_id=${encodeURIComponent(googleClientId.trim())}&client_secret=${encodeURIComponent(googleClientSecret.trim())}`}
                  className="px-4 py-2 rounded-md bg-zinc-950 text-white font-semibold hover:bg-zinc-800 transition-colors flex items-center gap-2 text-xs shadow-sm"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Connect with Google Account (OAuth)</span>
                </a>
              )}

              <div className="flex items-center gap-2 ml-auto">
                <Button variant="ghost" size="sm" type="button" onClick={() => setActiveConfigTab("overview")}>
                  Cancel
                </Button>
                <Button size="sm" type="submit" disabled={isSaving} className="bg-zinc-950 text-white font-semibold hover:bg-zinc-800 shadow-sm">
                  {isSaving ? "Saving & Syncing..." : "Save Google Credentials & Sync"}
                </Button>
              </div>
            </div>
          </form>
        )}

        {/* Tab 3: Configure Notion */}
        {activeConfigTab === "notion" && (
          <form onSubmit={handleSaveNotion} className="space-y-4 text-xs">
            <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-800 space-y-1">
              <span className="font-bold">Notion Integration Setup:</span>
              <p className="text-[11px] text-zinc-600 leading-relaxed">
                Create an internal integration at <a href="https://www.notion.so/my-integrations" target="_blank" rel="noreferrer" className="underline text-zinc-950 font-medium">notion.so/my-integrations</a>, then share your Projects database with it.
              </p>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-zinc-700 font-medium">Notion API Key (Internal Integration Secret)</label>
                <input
                  type="password"
                  value={notionApiKey}
                  onChange={(e) => setNotionApiKey(e.target.value)}
                  placeholder="secret_..."
                  className="w-full bg-white border border-zinc-200 rounded-lg p-2.5 text-zinc-900 placeholder-zinc-400 outline-none focus:border-zinc-950 font-mono text-xs shadow-2xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-700 font-medium">Notion Database ID</label>
                <input
                  type="text"
                  value={notionDatabaseId}
                  onChange={(e) => setNotionDatabaseId(e.target.value)}
                  placeholder="e.g. 2969f64c053f4c63bf1829e0689b91e9"
                  className="w-full bg-white border border-zinc-200 rounded-lg p-2.5 text-zinc-900 placeholder-zinc-400 outline-none focus:border-zinc-950 font-mono text-xs shadow-2xs"
                />
                <p className="text-[10px] text-zinc-500">
                  Find this in your Notion database link: notion.so/workspace/<strong>[database_id]</strong>?v=...
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
              <Button variant="ghost" size="sm" type="button" onClick={() => setActiveConfigTab("overview")}>
                Cancel
              </Button>
              <Button size="sm" type="submit" disabled={isSaving} className="bg-zinc-950 text-white font-semibold hover:bg-zinc-800 shadow-sm">
                {isSaving ? "Saving & Syncing..." : "Save Notion Credentials & Sync"}
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* Section 2: Productivity Preferences */}
      <div className="p-5 rounded-xl border border-zinc-200/90 bg-white/90 backdrop-blur-md space-y-4 shadow-xs">
        <h2 className="text-sm font-semibold text-zinc-950">Productivity Preferences</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1.5">
            <label className="text-zinc-600 font-medium">Default Working Mode</label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as any)}
              className="w-full bg-white border border-zinc-200 rounded-lg p-2 text-zinc-900 outline-none shadow-2xs font-medium"
            >
              <option value="default">Default Mode (Balanced Command Center)</option>
              <option value="exam">Exam Mode (Academic Deadlines Prioritized)</option>
              <option value="build">Build Mode (Sprint Tasks & GitHub Prioritized)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-zinc-600 font-medium">Default Focus Session Length</label>
            <select
              defaultValue="45"
              className="w-full bg-white border border-zinc-200 rounded-lg p-2 text-zinc-900 outline-none shadow-2xs font-medium"
            >
              <option value="25">25 minutes (Pomodoro)</option>
              <option value="45">45 minutes (Deep Work)</option>
              <option value="60">60 minutes (Sprint)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Section 3: Data Management & Demo Reset */}
      <div className="p-5 rounded-xl border border-zinc-200/90 bg-white/90 backdrop-blur-md space-y-4 shadow-xs">
        <h2 className="text-sm font-semibold text-zinc-950">Data & Cache Management</h2>
        <p className="text-xs text-zinc-600 leading-relaxed">
          NEXUS operates with instant local persistence. You can toggle back to clean demo data at any time or export all your synced data as JSON.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Button variant="outline" size="sm" onClick={handleExportData} className="text-xs h-8 border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50 shadow-xs">
            <Download className="w-3.5 h-3.5 mr-1.5 text-zinc-700" />
            Export Local Data (JSON)
          </Button>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={handlePurgeDemoData} 
            className="text-xs h-8 border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50 shadow-xs"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5 text-zinc-700" />
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
