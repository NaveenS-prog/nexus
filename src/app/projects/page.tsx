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
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-6">
          <div>
            <div className="flex items-center gap-2">
              <Rocket className="w-5 h-5 text-indigo-400" />
              <h1 className="text-2xl font-bold tracking-tight text-white">Projects & Sprints</h1>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Software initiatives, Kanban boards, and module dependency graphs
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-nexus-900/40 p-12 text-center space-y-4 max-w-md mx-auto mt-12">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
            <Rocket className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-zinc-100">No Projects Connected</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Connect your Notion database in Settings to import live projects, Kanban boards, and sprint trackers.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/settings"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors shadow-md"
            >
              <span>Go to Settings & Connect Notion</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <Rocket className="w-5 h-5 text-white" />
            <h1 className="text-2xl font-bold tracking-tight text-white">Projects & Sprints</h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Software initiatives, Kanban boards, and module dependency graphs
          </p>
        </div>

        {/* Project Selector */}
        <div className="flex items-center gap-3">
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 outline-none font-medium focus:border-white"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.progress}%)
              </option>
            ))}
          </select>

          <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded-lg p-0.5 text-xs">
            <button
              onClick={() => setActiveTab("kanban")}
              className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                activeTab === "kanban" ? "bg-white text-black font-semibold shadow-sm" : "text-zinc-400 hover:text-white"
              }`}
            >
              Kanban
            </button>
            <button
              onClick={() => setActiveTab("dependency")}
              className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                activeTab === "dependency" ? "bg-white text-black font-semibold shadow-sm" : "text-zinc-400 hover:text-white"
              }`}
            >
              Dependency Graph
            </button>
          </div>
        </div>
      </div>

      {/* Project Overview Card */}
      {currentProject && (
        <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-950 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-bold text-white">{currentProject.name}</h2>
                <Badge variant={currentProject.status === "in_progress" ? "default" : "secondary"}>
                  {currentProject.status.replace("_", " ").toUpperCase()}
                </Badge>
              </div>
              <p className="text-xs text-zinc-400 mt-1 max-w-2xl">{currentProject.description}</p>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono text-zinc-400">
              {currentProject.githubRepo && (
                <a
                  href={`https://github.com/${currentProject.githubRepo}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-zinc-300 hover:text-white"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>{currentProject.githubRepo}</span>
                </a>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
              <span>Sprint Completion Progress</span>
              <span className="font-bold text-white">{currentProject.progress}%</span>
            </div>
            <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-white h-full rounded-full transition-all duration-500"
                style={{ width: `${currentProject.progress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* View 1: Kanban Board */}
      {activeTab === "kanban" && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {kanbanColumns.map((col) => (
            <div key={col.id} className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950 space-y-3 flex flex-col">
              <div className="flex items-center justify-between pb-1 border-b border-zinc-800">
                <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-zinc-400">
                  {col.title}
                </span>
                <span className="text-[10px] font-mono text-zinc-300 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
                  {col.tasks.length}
                </span>
              </div>

              <div className="space-y-2 flex-1">
                {col.tasks.length === 0 ? (
                  <div className="py-6 text-center text-[11px] text-zinc-600 italic">
                    No tasks
                  </div>
                ) : (
                  col.tasks.map((task) => (
                    <div
                      key={task.id}
                      className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-white transition-all cursor-pointer space-y-2 group shadow-sm"
                    >
                      <p className="text-xs font-medium text-zinc-200 group-hover:text-white leading-snug">
                        {task.title}
                      </p>
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <Badge variant={task.priority === "critical" ? "destructive" : task.priority === "high" ? "warning" : "secondary"}>
                          {task.priority}
                        </Badge>
                        <span className="text-zinc-500">{task.estimatedMinutes ? `${task.estimatedMinutes}m` : "Task"}</span>
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
        <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-950 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-zinc-200">Module Dependency Visualizer</h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Click any architectural node to see specifications and downstream dependencies
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs text-zinc-400">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-zinc-200" /> Completed</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-white" /> In Progress</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-zinc-600" /> Pending</span>
            </div>
          </div>

          {/* Interactive Visual Graph Nodes */}
          <div className="p-8 rounded-lg bg-black border border-zinc-800 flex flex-col items-center space-y-6 overflow-x-auto">
            {/* Level 1: Auth */}
            <div
              onClick={() => setSelectedNode("node-1")}
              className={`px-5 py-3 rounded-lg border cursor-pointer transition-all text-xs font-mono font-medium ${
                selectedNode === "node-1" ? "border-white ring-2 ring-white/20" : "border-zinc-700"
              } bg-zinc-900 text-zinc-200 shadow-md`}
            >
              Authentication (OAuth / JWT Session) ✓
            </div>

            <div className="w-px h-6 bg-zinc-800" />

            {/* Level 2: User Profile */}
            <div
              onClick={() => setSelectedNode("node-2")}
              className={`px-5 py-3 rounded-lg border cursor-pointer transition-all text-xs font-mono font-medium ${
                selectedNode === "node-2" ? "border-white ring-2 ring-white/20" : "border-zinc-700"
              } bg-zinc-900 text-zinc-200 shadow-md`}
            >
              User Profile & Portfolio Store ✓
            </div>

            <div className="w-px h-6 bg-zinc-800" />

            {/* Level 3: REST API */}
            <div
              onClick={() => setSelectedNode("node-3")}
              className={`px-5 py-3 rounded-lg border cursor-pointer transition-all text-xs font-mono font-medium ${
                selectedNode === "node-3" ? "border-white ring-2 ring-white/20" : "border-zinc-700"
              } bg-zinc-900 text-zinc-200 shadow-md`}
            >
              FastAPI REST API Service ✓
            </div>

            <div className="w-px h-6 bg-zinc-800" />

            {/* Level 4: Branches */}
            <div className="grid grid-cols-2 gap-8 w-full max-w-lg">
              <div
                onClick={() => setSelectedNode("node-4")}
                className={`p-3 rounded-lg border cursor-pointer transition-all text-xs font-mono font-medium text-center ${
                  selectedNode === "node-4" ? "border-white ring-2 ring-white/20" : "border-white"
                } bg-white text-black font-bold shadow-md`}
              >
                PDF Resume Parser (Gemini) ⏳
              </div>

              <div
                onClick={() => setSelectedNode("node-db")}
                className={`p-3 rounded-lg border cursor-pointer transition-all text-xs font-mono font-medium text-center border-zinc-700 bg-zinc-900 text-zinc-200 shadow-md`}
              >
                PostgreSQL & pgvector ✓
              </div>
            </div>

            <div className="w-px h-6 bg-zinc-800" />

            {/* Level 5: Skill Extraction */}
            <div
              onClick={() => setSelectedNode("node-5")}
              className={`px-5 py-3 rounded-lg border cursor-pointer transition-all text-xs font-mono font-medium ${
                selectedNode === "node-5" ? "border-white ring-2 ring-white/20" : "border-white"
              } bg-white text-black font-bold shadow-md`}
            >
              Skill Gap Extraction Pipeline ⏳
            </div>

            <div className="w-px h-6 bg-zinc-800" />

            {/* Level 6: Recommendation */}
            <div
              onClick={() => setSelectedNode("node-6")}
              className={`px-5 py-3 rounded-lg border cursor-pointer transition-all text-xs font-mono font-medium ${
                selectedNode === "node-6" ? "border-white ring-2 ring-white/20" : "border-zinc-800"
              } bg-zinc-950 text-zinc-500 shadow-md`}
            >
              Automated Interview Recommendation Engine (Pending)
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
