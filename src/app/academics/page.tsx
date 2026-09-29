"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  GraduationCap,
  BookOpen,
  Calendar,
  CheckCircle2,
  Circle,
  ExternalLink,
  Clock,
  FileCheck,
  FolderSync,
  Bot,
  Sparkles,
  Plus,
  RefreshCw,
  Search,
  Filter,
  Check,
  AlertCircle,
  Layers,
  FileText,
  SlidersHorizontal,
  ChevronRight,
  Download,
  ShieldCheck,
  Folder,
  Send,
  X,
  FileUp,
  Laptop
} from "lucide-react";
import { format, parseISO, differenceInCalendarDays, startOfDay, isToday, isTomorrow } from "date-fns";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/badge";
import { 
  AcademicItem, 
  AcademicCourse, 
  AcademicItemType, 
  AcademicItemStatus,
  AcademicRequirement,
  AcademicWorkspace 
} from "@/lib/types/academic";

// Bulletproof safe date parser that NEVER throws RangeError
function parseSafeDate(dateStr?: string | null): Date | null {
  if (!dateStr || typeof dateStr !== "string") return null;
  const trimmed = dateStr.trim();
  if (!trimmed) return null;

  try {
    const d = parseISO(trimmed);
    if (!isNaN(d.getTime())) return d;
  } catch {}

  try {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) return d;
  } catch {}

  return null;
}

function formatSafeDate(dateStr?: string | null): string {
  if (!dateStr) return "No due date";
  const parsed = parseSafeDate(dateStr);
  if (!parsed) return "No due date";

  try {
    return format(parsed, "EEE, MMM d · h:mm a");
  } catch {
    return "No due date";
  }
}

export default function AcademicsPage() {
  const [activeTab, setActiveTab] = useState<"inbox" | "assignments" | "materials" | "courses">("inbox");
  const [items, setItems] = useState<AcademicItem[]>([]);
  const [courses, setCourses] = useState<AcademicCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>("all");
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>("all");

  // Modals & Drawers state
  const [showPairModal, setShowPairModal] = useState(false);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [pairingExpires, setPairingExpires] = useState<string | null>(null);
  const [isGeneratingPairing, setIsGeneratingPairing] = useState(false);

  const [showManualModal, setShowManualModal] = useState(false);
  const [manualTitle, setManualTitle] = useState("");
  const [manualCourse, setManualCourse] = useState("");
  const [manualDue, setManualDue] = useState("");
  const [manualType, setManualType] = useState<AcademicItemType>("ASSIGNMENT");
  const [manualInstructions, setManualInstructions] = useState("");
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);

  // Active AI Workspace modal
  const [activeWorkspaceItem, setActiveWorkspaceItem] = useState<AcademicItem | null>(null);
  const [workspaceAgentLoading, setWorkspaceAgentLoading] = useState(false);
  const [userDirectives, setUserDirectives] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [organizingDriveId, setOrganizingDriveId] = useState<string | null>(null);

  // Fetch real academic data from API
  const loadAcademicData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/academic/inbox");
      if (res.ok) {
        const data = await res.json();
        if (data.items) setItems(data.items);
        if (data.courses) setCourses(data.courses);
      }
    } catch (err) {
      console.error("Failed to load academic data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAcademicData();
  }, [loadAcademicData]);

  // Request Extension Pairing Code
  const handleGeneratePairingCode = async () => {
    setIsGeneratingPairing(true);
    try {
      const res = await fetch("/api/extension/pair");
      if (res.ok) {
        const data = await res.json();
        setPairingCode(data.pairingCode);
        setPairingExpires(data.expiresAt);
        setShowPairModal(true);
      }
    } catch (err) {
      console.error("Failed to generate pairing code:", err);
    } finally {
      setIsGeneratingPairing(false);
    }
  };

  // Submit Manual Academic Item
  const handleSubmitManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTitle || !manualCourse) return;

    setIsSubmittingManual(true);
    try {
      const res = await fetch("/api/academic/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "MANUAL",
          sourceUrl: "https://nexus.local/manual",
          title: manualTitle,
          courseName: manualCourse,
          dueAt: manualDue || null,
          instructions: manualInstructions,
          description: manualInstructions,
          attachments: [],
        }),
      });

      if (res.ok) {
        setShowManualModal(false);
        setManualTitle("");
        setManualCourse("");
        setManualDue("");
        setManualInstructions("");
        await loadAcademicData();
        setStatusMessage("Coursework captured successfully.");
        setTimeout(() => setStatusMessage(null), 4000);
      }
    } catch (err) {
      console.error("Manual ingestion error:", err);
    } finally {
      setIsSubmittingManual(false);
    }
  };

  // Organize Item to Google Drive
  const handleOrganizeToDrive = async (itemId: string) => {
    setOrganizingDriveId(itemId);
    try {
      const res = await fetch("/api/academic/drive/organize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage(data.message);
        await loadAcademicData();
      } else {
        setStatusMessage(data.message || data.error || "Google Drive organization failed.");
      }
    } catch (err: any) {
      setStatusMessage(err.message || "Failed to organize to Drive.");
    } finally {
      setOrganizingDriveId(null);
      setTimeout(() => setStatusMessage(null), 5000);
    }
  };

  // AI Workspace: Analyze Requirements
  const handleAnalyzeWorkspace = async (itemId: string) => {
    setWorkspaceAgentLoading(true);
    try {
      const res = await fetch("/api/academic/assignment/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId }),
      });
      if (res.ok) {
        await loadAcademicData();
        // Refresh active workspace item
        const updated = await fetch("/api/academic/inbox");
        const json = await updated.json();
        const found = json.items?.find((i: AcademicItem) => i.id === itemId);
        if (found) setActiveWorkspaceItem(found);
      }
    } catch (err) {
      console.error("Analyze error:", err);
    } finally {
      setWorkspaceAgentLoading(false);
    }
  };

  // AI Workspace: Generate Draft
  const handleGenerateDraft = async (itemId: string) => {
    setWorkspaceAgentLoading(true);
    try {
      const res = await fetch("/api/academic/assignment/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, userDirectives }),
      });
      if (res.ok) {
        await loadAcademicData();
        const updated = await fetch("/api/academic/inbox");
        const json = await updated.json();
        const found = json.items?.find((i: AcademicItem) => i.id === itemId);
        if (found) setActiveWorkspaceItem(found);
      }
    } catch (err) {
      console.error("Generate error:", err);
    } finally {
      setWorkspaceAgentLoading(false);
    }
  };

  // AI Workspace: Human Approval
  const handleApproveDraft = async (itemId: string) => {
    setWorkspaceAgentLoading(true);
    try {
      const res = await fetch("/api/academic/assignment/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId }),
      });
      if (res.ok) {
        await loadAcademicData();
        const updated = await fetch("/api/academic/inbox");
        const json = await updated.json();
        const found = json.items?.find((i: AcademicItem) => i.id === itemId);
        if (found) setActiveWorkspaceItem(found);
        setStatusMessage("Deliverable verified and approved!");
        setTimeout(() => setStatusMessage(null), 4000);
      }
    } catch (err) {
      console.error("Approval error:", err);
    } finally {
      setWorkspaceAgentLoading(false);
    }
  };

  // Filtered Items for Inbox
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (selectedTypeFilter !== "all" && item.type !== selectedTypeFilter) return false;
      if (selectedCourseFilter !== "all" && item.courseId !== selectedCourseFilter && item.courseName !== selectedCourseFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.title.toLowerCase().includes(q) ||
          item.courseName.toLowerCase().includes(q) ||
          item.instructions?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [items, selectedTypeFilter, selectedCourseFilter, searchQuery]);

  // Derived category lists
  const assignmentItems = useMemo(() => {
    return items.filter((i) => i.type === "ASSIGNMENT" || i.type === "PROJECT" || i.type === "LAB" || i.type === "EXAM");
  }, [items]);

  const materialItems = useMemo(() => {
    return items.filter((i) => i.type === "LECTURE_MATERIAL" || i.type === "REFERENCE_MATERIAL");
  }, [items]);

  const activeWorkspacesCount = useMemo(() => {
    return items.filter((i) => i.status === "IN_WORKSPACE" || i.status === "READY_FOR_REVIEW").length;
  }, [items]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8 font-sans animate-fade-in">
      {/* Status banner */}
      {statusMessage && (
        <div className="p-3 bg-surface border border-olive/30 rounded-md text-xs font-mono text-olive flex items-center justify-between shadow-xs">
          <span>{statusMessage}</span>
          <button onClick={() => setStatusMessage(null)} className="text-ink-muted hover:text-ink">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Header */}
      <div className="border-b border-hairline pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <GraduationCap className="w-5 h-5 text-olive" />
            <span className="text-xs font-mono uppercase tracking-wider text-ink-secondary font-medium">
              Academic Intelligence Layer
            </span>
          </div>
          <h1 className="font-editorial text-3xl sm:text-4xl font-normal text-ink tracking-tight">
            Academic Operations
          </h1>
          <p className="text-xs text-ink-secondary mt-1 max-w-xl">
            Google Classroom browser capture, semantic classification, Drive folder organization, and AI assignment validation.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            size="sm"
            variant="outline"
            onClick={handleGeneratePairingCode}
            disabled={isGeneratingPairing}
            className="text-xs h-8 border-hairline hover:border-olive/50 text-ink-secondary hover:text-ink flex items-center gap-1.5"
          >
            <Laptop className="w-3.5 h-3.5 text-olive" />
            <span>Connect Extension</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setShowManualModal(true)}
            className="bg-olive hover:bg-olive-hover text-white text-xs h-8 flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Coursework</span>
          </Button>
        </div>
      </div>

      {/* Top Level Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-4 rounded-md border border-hairline bg-surface flex flex-col justify-between space-y-1">
          <span className="font-mono text-[11px] text-ink-muted uppercase">Assignments</span>
          <span className="text-2xl font-serif text-ink">{assignmentItems.length}</span>
          <span className="text-[10px] text-ink-secondary">Deliverables tracked</span>
        </div>
        <div className="p-4 rounded-md border border-hairline bg-surface flex flex-col justify-between space-y-1">
          <span className="font-mono text-[11px] text-ink-muted uppercase">Materials</span>
          <span className="text-2xl font-serif text-ink">{materialItems.length}</span>
          <span className="text-[10px] text-ink-secondary">Lecture decks & notes</span>
        </div>
        <div className="p-4 rounded-md border border-hairline bg-surface flex flex-col justify-between space-y-1">
          <span className="font-mono text-[11px] text-ink-muted uppercase">Courses</span>
          <span className="text-2xl font-serif text-ink">{courses.length}</span>
          <span className="text-[10px] text-ink-secondary">Enrolled subjects</span>
        </div>
        <div className="p-4 rounded-md border border-hairline bg-surface flex flex-col justify-between space-y-1">
          <span className="font-mono text-[11px] text-ink-muted uppercase">AI Workspaces</span>
          <span className="text-2xl font-serif text-olive">{activeWorkspacesCount}</span>
          <span className="text-[10px] text-ink-secondary">Drafts in progress</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-hairline gap-6 text-xs">
        <button
          onClick={() => setActiveTab("inbox")}
          className={cn(
            "pb-3 font-medium transition-colors border-b-2 flex items-center gap-1.5",
            activeTab === "inbox"
              ? "border-olive text-ink font-semibold"
              : "border-transparent text-ink-muted hover:text-ink"
          )}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Academic Inbox ({items.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("assignments")}
          className={cn(
            "pb-3 font-medium transition-colors border-b-2 flex items-center gap-1.5",
            activeTab === "assignments"
              ? "border-olive text-ink font-semibold"
              : "border-transparent text-ink-muted hover:text-ink"
          )}
        >
          <FileCheck className="w-3.5 h-3.5" />
          <span>Assignments Radar ({assignmentItems.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("materials")}
          className={cn(
            "pb-3 font-medium transition-colors border-b-2 flex items-center gap-1.5",
            activeTab === "materials"
              ? "border-olive text-ink font-semibold"
              : "border-transparent text-ink-muted hover:text-ink"
          )}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Course Materials ({materialItems.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("courses")}
          className={cn(
            "pb-3 font-medium transition-colors border-b-2 flex items-center gap-1.5",
            activeTab === "courses"
              ? "border-olive text-ink font-semibold"
              : "border-transparent text-ink-muted hover:text-ink"
          )}
        >
          <Folder className="w-3.5 h-3.5" />
          <span>Registered Courses ({courses.length})</span>
        </button>
      </div>

      {/* TAB 1: ACADEMIC INBOX */}
      {activeTab === "inbox" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between text-xs">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-ink-muted" />
              <input
                type="text"
                placeholder="Search coursework, materials, or topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-surface border border-hairline rounded-md text-xs text-ink outline-none focus:border-olive"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedTypeFilter}
                onChange={(e) => setSelectedTypeFilter(e.target.value)}
                className="bg-surface border border-hairline rounded-md px-2.5 py-1.5 text-xs text-ink outline-none focus:border-olive"
              >
                <option value="all">All Item Types</option>
                <option value="ASSIGNMENT">Assignments</option>
                <option value="PROJECT">Projects</option>
                <option value="LAB">Labs</option>
                <option value="LECTURE_MATERIAL">Lecture Materials</option>
                <option value="REFERENCE_MATERIAL">Reference Docs</option>
                <option value="EXAM">Exams</option>
                <option value="ANNOUNCEMENT">Announcements</option>
              </select>

              <select
                value={selectedCourseFilter}
                onChange={(e) => setSelectedCourseFilter(e.target.value)}
                className="bg-surface border border-hairline rounded-md px-2.5 py-1.5 text-xs text-ink outline-none focus:border-olive"
              >
                <option value="all">All Courses</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Genuine Empty State */}
          {items.length === 0 ? (
            <div className="p-12 rounded-md border border-hairline bg-surface text-center space-y-3">
              <div className="w-10 h-10 mx-auto rounded-full bg-canvas flex items-center justify-center text-ink-muted">
                <GraduationCap className="w-5 h-5 text-olive" />
              </div>
              <h3 className="font-editorial text-lg text-ink font-medium">No academic items yet.</h3>
              <p className="text-xs text-ink-secondary max-w-md mx-auto">
                Connect the NEXUS browser extension to capture Classroom content, or add coursework manually using the button above.
              </p>
              <div className="pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleGeneratePairingCode}
                  className="text-xs border-hairline text-ink"
                >
                  <Laptop className="w-3.5 h-3.5 mr-1.5 text-olive" />
                  Connect Browser Extension
                </Button>
              </div>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-8 rounded-md border border-hairline bg-surface text-center text-xs text-ink-muted">
              No academic items match your current search and filter settings.
            </div>
          ) : (
            <div className="space-y-2">
              {filteredItems.map((item) => {
                const isAssignment = ["ASSIGNMENT", "PROJECT", "LAB", "EXAM"].includes(item.type);
                const hasWorkspace = Boolean(item.workspace);

                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-md border border-hairline bg-surface hover:border-hairline-darker transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
                        <span className="text-olive font-semibold">{item.courseName}</span>
                        <span>·</span>
                        <span className="px-1.5 py-0.5 rounded bg-canvas border border-hairline text-ink-secondary">
                          {item.type.replace(/_/g, " ")}
                        </span>
                        {item.priority === "critical" && (
                          <span className="px-1.5 py-0.5 rounded bg-terracotta/10 text-terracotta font-semibold">
                            CRITICAL
                          </span>
                        )}
                        {item.status === "ORGANIZED" && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                            DRIVE ORGANIZED
                          </span>
                        )}
                      </div>

                      <h4 className="font-editorial text-base text-ink font-medium truncate">
                        {item.title}
                      </h4>

                      {item.instructions && (
                        <p className="text-xs text-ink-secondary line-clamp-2">
                          {item.instructions}
                        </p>
                      )}

                      <div className="flex items-center gap-4 text-[11px] text-ink-muted font-mono pt-1">
                        {item.dueAt ? (
                          <span className="flex items-center gap-1 text-ink-secondary">
                            <Clock className="w-3 h-3 text-olive" />
                            {formatSafeDate(item.dueAt)}
                          </span>
                        ) : (
                          <span>No due date</span>
                        )}
                        {item.attachments && item.attachments.length > 0 && (
                          <span>{item.attachments.length} attachment{item.attachments.length !== 1 ? "s" : ""}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      {isAssignment && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setActiveWorkspaceItem(item)}
                          className="text-xs h-7 border-hairline hover:border-olive/50 text-ink flex items-center gap-1.5"
                        >
                          <Bot className="w-3.5 h-3.5 text-olive" />
                          <span>{hasWorkspace ? "Open Workspace" : "Start AI Workspace"}</span>
                        </Button>
                      )}

                      {!isAssignment && item.status !== "ORGANIZED" && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={organizingDriveId === item.id}
                          onClick={() => handleOrganizeToDrive(item.id)}
                          className="text-xs h-7 border-hairline hover:border-olive/50 text-ink flex items-center gap-1.5"
                        >
                          <FolderSync className={`w-3.5 h-3.5 text-olive ${organizingDriveId === item.id ? "animate-spin" : ""}`} />
                          <span>Organize to Drive</span>
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ASSIGNMENTS RADAR */}
      {activeTab === "assignments" && (
        <div className="space-y-4">
          {assignmentItems.length === 0 ? (
            <div className="p-12 rounded-md border border-hairline bg-surface text-center space-y-3">
              <CheckCircle2 className="w-8 h-8 text-olive mx-auto" />
              <h3 className="font-editorial text-lg text-ink font-medium">You're all caught up.</h3>
              <p className="text-xs text-ink-secondary max-w-sm mx-auto">
                No active assignment deadlines detected. Captured coursework from Google Classroom will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {assignmentItems.map((item) => (
                <div
                  key={item.id}
                  className="p-5 rounded-md border border-hairline bg-surface hover:border-hairline-darker transition-all flex flex-col justify-between space-y-4 shadow-xs"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-[11px] text-olive font-medium">
                        {item.courseName}
                      </span>
                      <span className="font-mono text-[10px] uppercase px-1.5 py-0.5 rounded bg-canvas border border-hairline text-ink-secondary">
                        {item.type}
                      </span>
                    </div>

                    <h4 className="font-editorial text-lg text-ink font-medium leading-tight">
                      {item.title}
                    </h4>

                    {item.instructions && (
                      <p className="text-xs text-ink-secondary line-clamp-3">
                        {item.instructions}
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-hairline flex items-center justify-between text-xs font-mono">
                    <span className="text-ink-secondary">
                      {item.dueAt ? formatSafeDate(item.dueAt) : "No cutoff date"}
                    </span>

                    <Button
                      size="sm"
                      onClick={() => setActiveWorkspaceItem(item)}
                      className="bg-olive hover:bg-olive-hover text-white text-xs h-7 flex items-center gap-1.5 shadow-xs"
                    >
                      <Bot className="w-3.5 h-3.5" />
                      <span>AI Workspace</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: COURSE MATERIALS & DRIVE */}
      {activeTab === "materials" && (
        <div className="space-y-4">
          {materialItems.length === 0 ? (
            <div className="p-12 rounded-md border border-hairline bg-surface text-center space-y-3">
              <FolderSync className="w-8 h-8 text-olive mx-auto" />
              <h3 className="font-editorial text-lg text-ink font-medium">Connect Google Drive to organize your course materials.</h3>
              <p className="text-xs text-ink-secondary max-w-md mx-auto">
                Lecture slides, syllabus documents, and reading materials captured from Google Classroom can be automatically organized into dedicated course folders in your Google Drive.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {materialItems.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-md border border-hairline bg-surface flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[11px] font-mono">
                      <span className="text-olive font-semibold">{item.courseName}</span>
                      <span>·</span>
                      <span className="text-ink-muted">{item.type.replace(/_/g, " ")}</span>
                    </div>
                    <h4 className="font-editorial text-base text-ink font-medium">
                      {item.title}
                    </h4>
                    {item.attachments && item.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {item.attachments.map((att) => (
                          <span
                            key={att.id}
                            className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-canvas border border-hairline text-ink-secondary"
                          >
                            <FileText className="w-3 h-3 text-olive" />
                            {att.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    disabled={organizingDriveId === item.id || item.status === "ORGANIZED"}
                    onClick={() => handleOrganizeToDrive(item.id)}
                    className="text-xs h-7 border-hairline text-ink flex items-center gap-1.5"
                  >
                    <FolderSync className={`w-3.5 h-3.5 text-olive ${organizingDriveId === item.id ? "animate-spin" : ""}`} />
                    <span>{item.status === "ORGANIZED" ? "Organized in Drive" : "Organize into Course Folder"}</span>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: REGISTERED COURSES */}
      {activeTab === "courses" && (
        <div className="space-y-4">
          {courses.length === 0 ? (
            <div className="p-12 rounded-md border border-hairline bg-surface text-center space-y-3">
              <BookOpen className="w-8 h-8 text-olive mx-auto" />
              <h3 className="font-editorial text-lg text-ink font-medium">No courses registered yet.</h3>
              <p className="text-xs text-ink-secondary max-w-sm mx-auto">
                Courses are automatically registered when coursework or lecture materials are captured from Google Classroom.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {courses.map((course) => {
                const courseItemCount = items.filter((i) => i.courseId === course.id || i.courseName === course.name).length;

                return (
                  <div
                    key={course.id}
                    className="p-5 rounded-md border border-hairline bg-surface hover:border-hairline-darker transition-all space-y-3 shadow-xs"
                  >
                    <div className="flex items-center justify-between text-xs">
                      {course.courseCode ? (
                        <span className="font-mono text-olive font-semibold px-1.5 py-0.5 rounded bg-olive/10">
                          {course.courseCode}
                        </span>
                      ) : (
                        <span className="font-mono text-ink-muted">COURSE</span>
                      )}
                      {course.section && (
                        <span className="text-[11px] font-mono text-ink-secondary">
                          {course.section}
                        </span>
                      )}
                    </div>

                    <h4 className="font-editorial text-lg text-ink font-medium">
                      {course.name}
                    </h4>

                    <div className="pt-2 border-t border-hairline flex items-center justify-between text-xs font-mono text-ink-secondary">
                      <span>{courseItemCount} item{courseItemCount !== 1 ? "s" : ""} recorded</span>
                      {course.driveFolderId && (
                        <span className="text-emerald-700 flex items-center gap-1">
                          <Folder className="w-3 h-3 text-emerald-600" />
                          Drive Sync Active
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: BROWSER EXTENSION PAIRING */}
      {showPairModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface border border-hairline rounded-lg max-w-md w-full p-6 space-y-5 shadow-lg">
            <div className="flex items-center justify-between border-b border-hairline pb-3">
              <div className="flex items-center gap-2">
                <Laptop className="w-4 h-4 text-olive" />
                <h3 className="font-editorial text-lg font-medium text-ink">
                  Pair Browser Extension
                </h3>
              </div>
              <button
                onClick={() => setShowPairModal(false)}
                className="text-ink-muted hover:text-ink text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-ink-secondary leading-relaxed">
              Open the NEXUS Academic Capture extension in Chrome and enter the 6-digit authentication pairing code below:
            </p>

            <div className="p-4 bg-canvas rounded-md border border-hairline text-center space-y-1">
              <span className="text-[11px] font-mono text-ink-muted uppercase tracking-wider">
                Temporary Pairing Code
              </span>
              <div className="text-3xl font-mono font-bold text-olive tracking-widest">
                {pairingCode || "NX-••••••"}
              </div>
              <span className="text-[10px] font-mono text-ink-muted block">
                Valid for 15 minutes · Never shares your Google passwords
              </span>
            </div>

            <ol className="text-xs text-ink-secondary space-y-2 list-decimal list-inside bg-surface p-3 rounded border border-hairline">
              <li>Open Google Classroom in your browser.</li>
              <li>Click the NEXUS icon in your Chrome toolbar.</li>
              <li>Paste the code above and click <strong>Pair with NEXUS</strong>.</li>
              <li>Click <strong>Send to NEXUS</strong> on any assignment or stream item.</li>
            </ol>

            <Button
              className="w-full bg-olive hover:bg-olive-hover text-white text-xs h-8"
              onClick={() => setShowPairModal(false)}
            >
              Done
            </Button>
          </div>
        </div>
      )}

      {/* MODAL 2: MANUAL COURSEWORK ENTRY */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSubmitManual}
            className="bg-surface border border-hairline rounded-lg max-w-lg w-full p-6 space-y-4 shadow-lg"
          >
            <div className="flex items-center justify-between border-b border-hairline pb-3">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-olive" />
                <h3 className="font-editorial text-lg font-medium text-ink">
                  Add Coursework Manually
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowManualModal(false)}
                className="text-ink-muted hover:text-ink text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-ink-secondary font-medium mb-1">
                  Course Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Operating Systems (CS301)"
                  value={manualCourse}
                  onChange={(e) => setManualCourse(e.target.value)}
                  className="w-full bg-canvas border border-hairline rounded-md p-2 text-xs text-ink outline-none focus:border-olive"
                />
              </div>

              <div>
                <label className="block text-ink-secondary font-medium mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Virtual Memory Simulation Lab"
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  className="w-full bg-canvas border border-hairline rounded-md p-2 text-xs text-ink outline-none focus:border-olive"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-ink-secondary font-medium mb-1">
                    Item Classification
                  </label>
                  <select
                    value={manualType}
                    onChange={(e) => setManualType(e.target.value as AcademicItemType)}
                    className="w-full bg-canvas border border-hairline rounded-md p-2 text-xs text-ink outline-none focus:border-olive"
                  >
                    <option value="ASSIGNMENT">Assignment</option>
                    <option value="PROJECT">Term Project</option>
                    <option value="LAB">Lab Session</option>
                    <option value="LECTURE_MATERIAL">Lecture Notes</option>
                    <option value="REFERENCE_MATERIAL">Reference Material</option>
                    <option value="EXAM">Examination</option>
                  </select>
                </div>

                <div>
                  <label className="block text-ink-secondary font-medium mb-1">
                    Due Date (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={manualDue}
                    onChange={(e) => setManualDue(e.target.value)}
                    className="w-full bg-canvas border border-hairline rounded-md p-2 text-xs text-ink outline-none focus:border-olive"
                  />
                </div>
              </div>

              <div>
                <label className="block text-ink-secondary font-medium mb-1">
                  Instructions & Guidelines
                </label>
                <textarea
                  rows={4}
                  placeholder="Paste rubric guidelines, submission instructions, or study notes..."
                  value={manualInstructions}
                  onChange={(e) => setManualInstructions(e.target.value)}
                  className="w-full bg-canvas border border-hairline rounded-md p-2 text-xs text-ink outline-none focus:border-olive"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-hairline">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowManualModal(false)}
                className="text-xs border-hairline"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmittingManual}
                className="bg-olive hover:bg-olive-hover text-white text-xs"
              >
                {isSubmittingManual ? "Saving..." : "Add to NEXUS"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* DRAWER / MODAL: AI ASSIGNMENT WORKSPACE */}
      {activeWorkspaceItem && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface border border-hairline rounded-lg max-w-3xl w-full max-h-[90vh] flex flex-col shadow-xl">
            {/* Header */}
            <div className="p-6 border-b border-hairline flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-mono text-olive mb-1">
                  <span>{activeWorkspaceItem.courseName}</span>
                  <span>·</span>
                  <span className="uppercase">{activeWorkspaceItem.workspace?.state || "DETECTED"}</span>
                </div>
                <h2 className="font-editorial text-2xl font-normal text-ink">
                  {activeWorkspaceItem.title}
                </h2>
              </div>
              <button
                onClick={() => setActiveWorkspaceItem(null)}
                className="text-ink-muted hover:text-ink text-sm p-1"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {/* Instructions */}
              {activeWorkspaceItem.instructions && (
                <div className="p-4 bg-canvas rounded-md border border-hairline space-y-1">
                  <span className="font-mono text-[11px] text-ink-muted uppercase">Coursework Instructions</span>
                  <p className="text-xs text-ink-secondary whitespace-pre-wrap leading-relaxed">
                    {activeWorkspaceItem.instructions}
                  </p>
                </div>
              )}

              {/* Requirements Extraction Panel */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-hairline pb-2">
                  <h4 className="font-mono text-xs uppercase tracking-wider text-ink-secondary font-medium">
                    1. Requirements Checklist
                  </h4>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={workspaceAgentLoading}
                    onClick={() => handleAnalyzeWorkspace(activeWorkspaceItem.id)}
                    className="text-xs h-7 border-hairline hover:border-olive text-ink flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-olive" />
                    <span>Extract Requirements</span>
                  </Button>
                </div>

                {activeWorkspaceItem.requirements && activeWorkspaceItem.requirements.length > 0 ? (
                  <div className="space-y-2">
                    {activeWorkspaceItem.requirements.map((req) => (
                      <div
                        key={req.id}
                        className="p-3 rounded border border-hairline bg-surface flex items-start justify-between gap-3"
                      >
                        <div className="flex items-start gap-2.5">
                          {req.status === "SATISFIED" ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                          ) : (
                            <Circle className="w-4 h-4 text-ink-muted mt-0.5 shrink-0" />
                          )}
                          <div className="space-y-0.5">
                            <span className="text-xs text-ink font-medium">{req.description}</span>
                            <div className="flex items-center gap-2 text-[10px] font-mono text-ink-muted">
                              <span className="uppercase">{req.type}</span>
                              {req.mandatory && <span className="text-terracotta">Mandatory</span>}
                            </div>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-canvas border border-hairline text-ink-muted">
                          {req.status}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-ink-muted italic">
                    Click "Extract Requirements" to analyze this assignment with AI and extract structured deliverables.
                  </p>
                )}
              </div>

              {/* AI Draft Generator Panel */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-hairline pb-2">
                  <h4 className="font-mono text-xs uppercase tracking-wider text-ink-secondary font-medium">
                    2. Deliverable Draft Generation
                  </h4>
                  <Button
                    size="sm"
                    disabled={workspaceAgentLoading}
                    onClick={() => handleGenerateDraft(activeWorkspaceItem.id)}
                    className="bg-olive hover:bg-olive-hover text-white text-xs h-7 flex items-center gap-1.5 shadow-xs"
                  >
                    <Bot className="w-3.5 h-3.5" />
                    <span>Generate AI Draft</span>
                  </Button>
                </div>

                <input
                  type="text"
                  placeholder="Optional custom directives (e.g. Focus specifically on LRU page replacement algorithm)"
                  value={userDirectives}
                  onChange={(e) => setUserDirectives(e.target.value)}
                  className="w-full bg-canvas border border-hairline rounded-md p-2 text-xs text-ink outline-none focus:border-olive"
                />

                {/* Generated Deliverables View */}
                {activeWorkspaceItem.workspace?.generatedFiles && activeWorkspaceItem.workspace.generatedFiles.length > 0 && (
                  <div className="space-y-3 pt-2">
                    {activeWorkspaceItem.workspace.generatedFiles.map((file, idx) => (
                      <div key={idx} className="border border-hairline rounded-md overflow-hidden bg-surface">
                        <div className="p-3 bg-canvas border-b border-hairline flex items-center justify-between font-mono text-xs">
                          <span className="text-ink font-medium">{file.name}</span>
                          <span className="text-ink-muted">{file.mimeType}</span>
                        </div>
                        <div className="p-4 bg-surface font-mono text-[11px] text-ink whitespace-pre-wrap max-h-60 overflow-y-auto leading-relaxed">
                          {file.content}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Independent Review & Human Approval */}
              {activeWorkspaceItem.workspace?.reviewResults && (
                <div className="p-4 rounded-md border border-hairline bg-surface space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <h4 className="font-mono text-xs uppercase tracking-wider text-ink font-medium">
                        Independent Validation Review
                      </h4>
                    </div>
                    <span className="font-mono text-xs text-emerald-700 font-semibold px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200">
                      Score: {activeWorkspaceItem.workspace.reviewResults.score}%
                    </span>
                  </div>

                  <ul className="text-xs text-ink-secondary space-y-1 list-disc list-inside">
                    {activeWorkspaceItem.workspace.reviewResults.feedback.map((fb, idx) => (
                      <li key={idx}>{fb}</li>
                    ))}
                  </ul>

                  {/* Strict Human Approval Gate */}
                  <div className="pt-3 border-t border-hairline flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="text-[11px] text-ink-muted">
                      {activeWorkspaceItem.workspace.userApproved ? (
                        <span className="text-emerald-700 font-medium">✓ Approved by student</span>
                      ) : (
                        <span>Review draft before marking finalized for submission.</span>
                      )}
                    </div>

                    {!activeWorkspaceItem.workspace.userApproved ? (
                      <Button
                        size="sm"
                        disabled={workspaceAgentLoading}
                        onClick={() => handleApproveDraft(activeWorkspaceItem.id)}
                        className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs h-7 flex items-center gap-1.5 shadow-xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve Deliverable as Final</span>
                      </Button>
                    ) : (
                      <span className="text-xs font-mono text-emerald-700 font-semibold">
                        FINALIZED & READY FOR SUBMISSION
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-hairline flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveWorkspaceItem(null)}
                className="text-xs border-hairline"
              >
                Close Workspace
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
