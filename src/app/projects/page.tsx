"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { 
  Rocket, 
  GitBranch, 
  Layers, 
  CheckCircle2, 
  Clock, 
  Plus, 
  ExternalLink, 
  ArrowRight,
  ChevronDown
} from "lucide-react";
import { useNexusStore } from "@/lib/data/store";
import { Project, Priority } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function ProjectsPage() {
  const { projects, items } = useNexusStore();
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id || "");
  const [activeTab, setActiveTab] = useState<"kanban" | "dependency">("kanban");
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const currentProject = projects.find((p) => p.id === selectedProjectId) || projects[0];

  // Derive Kanban tasks strictly from real items matching the active project or Notion items
  const projectTasks = useMemo(() => {
    if (!currentProject) return [];
    return items.filter(
      (item) => item.projectId === currentProject.id || item.source === "notion"
    );
  }, [items, currentProject]);

  const kanbanColumns = useMemo(() => [
    {
      id: "backlog",
      title: "BACKLOG",
      tasks: projectTasks.filter((t) => t.status === "pending" && (t.priority === "low" || !t.priority)),
    },
    {
      id: "in_progress",
      title: "IN PROGRESS",
      tasks: projectTasks.filter((t) => t.status === "in_progress" || (t.status === "pending" && (t.priority === "high" || t.priority === "critical"))),
    },
    {
      id: "review",
      title: "REVIEW",
      tasks: projectTasks.filter((t) => t.status === "pending" && t.priority === "medium"),
    },
    {
      id: "done",
      title: "DONE",
      tasks: projectTasks.filter((t) => t.status === "completed"),
    },
  ], [projectTasks]);

  if (projects.length === 0) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6 animate-fade-in text-ink">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-hairline pb-6">
          <div>
            <div className="flex items-center gap-2">
              <Rocket className="w-5 h-5 text-olive" />
              <h1 className="text-2xl font-serif font-semibold tracking-tight text-ink">Projects & Workspaces</h1>
            </div>
            <p className="text-xs text-ink-muted mt-1">
              Active engineering initiatives, deliverables, and architecture blueprints
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-hairline bg-surface p-12 text-center space-y-4 max-w-md mx-auto mt-12">
          <div className="w-12 h-12 rounded-xl bg-olive-light/30 border border-olive/30 text-olive flex items-center justify-center mx-auto">
            <Rocket className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-serif font-semibold text-ink">No Projects Connected</h3>
            <p className="text-xs text-ink-muted leading-relaxed">
              Connect your Notion database in Settings to import live projects, Kanban boards, and sprint trackers.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/settings"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-olive hover:bg-olive-hover text-white text-xs font-medium transition-colors shadow-xs"
            >
              <span>Go to Settings & Connect Notion</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-6 animate-fade-in text-ink">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-hairline pb-6">
        <div>
          <div className="flex items-center gap-2">
            <Rocket className="w-5 h-5 text-olive" />
            <h1 className="text-2xl font-serif font-semibold tracking-tight text-ink">Projects & Workspaces</h1>
          </div>
          <p className="text-xs text-ink-muted mt-1">
            Active engineering initiatives, deliverables, and architecture blueprints
          </p>
        </div>

        {/* Project Selector & Views */}
        <div className="flex items-center gap-3">
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="bg-surface border border-hairline rounded-lg px-3 py-1.5 text-xs text-ink outline-none font-medium focus:border-olive"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.progress}%)
              </option>
            ))}
          </select>

          <div className="flex items-center bg-canvas-secondary border border-hairline rounded-lg p-0.5 text-xs">
            <button
              onClick={() => setActiveTab("kanban")}
              className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                activeTab === "kanban" ? "bg-surface text-ink font-semibold shadow-xs" : "text-ink-muted hover:text-ink"
              }`}
            >
              Kanban
            </button>
            <button
              onClick={() => setActiveTab("dependency")}
              className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                activeTab === "dependency" ? "bg-surface text-ink font-semibold shadow-xs" : "text-ink-muted hover:text-ink"
              }`}
            >
              Dependency Graph
            </button>
          </div>
        </div>
      </div>

      {/* Project Overview Workspace Card */}
      {currentProject && (
        <div className="p-6 rounded-xl border border-hairline bg-surface space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-serif font-semibold text-ink">{currentProject.name}</h2>
                <Badge variant={currentProject.status === "in_progress" ? "olive" : "parchment"}>
                  {currentProject.status.replace("_", " ").toUpperCase()}
                </Badge>
              </div>
              <p className="text-xs text-ink-secondary mt-1 max-w-2xl">{currentProject.description}</p>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono text-ink-muted">
              {currentProject.githubRepo && (
                <a
                  href={`https://github.com/${currentProject.githubRepo}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-ink-secondary hover:text-olive transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>{currentProject.githubRepo}</span>
                </a>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono text-ink-muted">
              <span>Sprint Completion Progress</span>
              <span className="font-bold text-olive">{currentProject.progress}%</span>
            </div>
            <div className="w-full bg-canvas-secondary h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-olive h-full rounded-full transition-all duration-500"
                style={{ width: `${currentProject.progress}%` }}
              />
            </div>
          </div>

          {/* Calm Workspace Context Strip (Current Objective & Next Action) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3 rounded-lg bg-canvas border border-hairline text-xs">
              <span className="text-[10px] font-mono uppercase tracking-wider text-ink-muted block mb-1">
                Current Objective
              </span>
              <p className="font-medium text-ink">Implement resume parsing engine & OAuth route guards</p>
            </div>
            <div className="p-3 rounded-lg bg-canvas border border-hairline text-xs">
              <span className="text-[10px] font-mono uppercase tracking-wider text-olive block mb-1">
                Next Action
              </span>
              <p className="font-medium text-ink">Connect FastAPI pgvector embedding pipeline</p>
            </div>
          </div>
        </div>
      )}

      {/* View 1: Kanban Board */}
      {activeTab === "kanban" && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {kanbanColumns.map((col) => (
            <div key={col.id} className="p-4 rounded-xl border border-hairline bg-surface space-y-3 flex flex-col">
              <div className="flex items-center justify-between pb-1.5 border-b border-hairline">
                <span className="text-[11px] font-mono uppercase tracking-wider font-semibold text-ink-muted">
                  {col.title}
                </span>
                <span className="text-[10px] font-mono text-ink-muted bg-canvas-secondary px-1.5 py-0.5 rounded border border-hairline">
                  {col.tasks.length}
                </span>
              </div>

              <div className="space-y-2 flex-1">
                {col.tasks.length === 0 ? (
                  <div className="py-6 text-center text-[11px] text-ink-muted italic">
                    No tasks
                  </div>
                ) : (
                  col.tasks.map((task) => (
                    <div
                      key={task.id}
                      className="p-3 rounded-lg bg-canvas border border-hairline hover:border-olive/50 transition-all cursor-pointer space-y-2 group shadow-xs"
                    >
                      <p className="text-xs font-medium text-ink group-hover:text-olive leading-snug">
                        {task.title}
                      </p>
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <Badge variant={task.priority === "critical" ? "terracotta" : task.priority === "high" ? "parchment" : "outline"}>
                          {task.priority}
                        </Badge>
                        <span className="text-ink-muted">{task.estimatedMinutes ? `${task.estimatedMinutes}m` : "Task"}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View 2: Project Dependency Graph */}
      {activeTab === "dependency" && (
        <div className="p-6 rounded-xl border border-hairline bg-surface space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-serif font-semibold text-ink">Module Dependency Visualizer</h3>
              <p className="text-xs text-ink-muted mt-0.5">
                Click any architectural node to see specifications and downstream dependencies
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs text-ink-muted font-mono">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-olive" /> Completed</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-terracotta" /> In Progress</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-stone-300" /> Pending</span>
            </div>
          </div>

          {/* Interactive Visual Graph Nodes */}
          <div className="p-8 rounded-lg bg-canvas border border-hairline flex flex-col items-center space-y-6 overflow-x-auto">
            {/* Level 1: Auth */}
            <div
              onClick={() => setSelectedNode("node-1")}
              className={`px-5 py-3 rounded-lg border cursor-pointer transition-all text-xs font-mono font-medium ${
                selectedNode === "node-1" ? "border-olive ring-1 ring-olive/20" : "border-hairline"
              } bg-surface text-ink shadow-xs`}
            >
              Authentication (OAuth / JWT Session) ✓
            </div>

            <div className="w-px h-6 bg-divider" />

            {/* Level 2: User Profile */}
            <div
              onClick={() => setSelectedNode("node-2")}
              className={`px-5 py-3 rounded-lg border cursor-pointer transition-all text-xs font-mono font-medium ${
                selectedNode === "node-2" ? "border-olive ring-1 ring-olive/20" : "border-hairline"
              } bg-surface text-ink shadow-xs`}
            >
              User Profile & Portfolio Store ✓
            </div>

            <div className="w-px h-6 bg-divider" />

            {/* Level 3: REST API */}
            <div
              onClick={() => setSelectedNode("node-3")}
              className={`px-5 py-3 rounded-lg border cursor-pointer transition-all text-xs font-mono font-medium ${
                selectedNode === "node-3" ? "border-olive ring-1 ring-olive/20" : "border-hairline"
              } bg-surface text-ink shadow-xs`}
            >
              FastAPI REST API Service ✓
            </div>

            <div className="w-px h-6 bg-divider" />

            {/* Level 4: Branches */}
            <div className="grid grid-cols-2 gap-8 w-full max-w-lg">
              <div
                onClick={() => setSelectedNode("node-4")}
                className={`p-3 rounded-lg border cursor-pointer transition-all text-xs font-mono font-medium text-center ${
                  selectedNode === "node-4" ? "border-olive ring-1 ring-olive/20" : "border-olive/50"
                } bg-olive-light/20 text-olive font-bold shadow-xs`}
              >
                PDF Resume Parser (Gemini) ⏳
              </div>

              <div
                onClick={() => setSelectedNode("node-db")}
                className={`p-3 rounded-lg border cursor-pointer transition-all text-xs font-mono font-medium text-center border-hairline bg-surface text-ink shadow-xs`}
              >
                PostgreSQL & pgvector ✓
              </div>
            </div>

            <div className="w-px h-6 bg-divider" />

            {/* Level 5: Skill Extraction */}
            <div
              onClick={() => setSelectedNode("node-5")}
              className={`px-5 py-3 rounded-lg border cursor-pointer transition-all text-xs font-mono font-medium ${
                selectedNode === "node-5" ? "border-olive ring-1 ring-olive/20" : "border-olive/50"
              } bg-olive-light/20 text-olive font-bold shadow-xs`}
            >
              Skill Gap Extraction Pipeline ⏳
            </div>

            <div className="w-px h-6 bg-divider" />

            {/* Level 6: Recommendation */}
            <div
              onClick={() => setSelectedNode("node-6")}
              className={`px-5 py-3 rounded-lg border cursor-pointer transition-all text-xs font-mono font-medium ${
                selectedNode === "node-6" ? "border-olive ring-1 ring-olive/20" : "border-hairline"
              } bg-surface text-ink-muted shadow-xs`}
            >
              Automated Interview Recommendation Engine (Pending)
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
