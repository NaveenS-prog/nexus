"use client";

import { useState } from "react";
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
import { Project, ProjectTask, Priority } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function ProjectsPage() {
  const { projects } = useNexusStore();
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id || "proj-ai-placement");
  const [activeTab, setActiveTab] = useState<"kanban" | "dependency">("kanban");
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const currentProject = projects.find((p) => p.id === selectedProjectId) || projects[0];

  // Sample Kanban tasks for the active project
  const kanbanColumns = [
    {
      id: "backlog",
      title: "BACKLOG",
      tasks: [
        { id: "k1", title: "Automated Interview Recommendation Engine", priority: "medium" as Priority, points: 5 },
        { id: "k2", title: "Supabase Vector Store integration for resumes", priority: "high" as Priority, points: 8 },
        { id: "k3", title: "Export evaluation reports to PDF format", priority: "low" as Priority, points: 3 },
      ],
    },
    {
      id: "in_progress",
      title: "IN PROGRESS",
      tasks: [
        { id: "k4", title: "PDF Skill Extraction with Gemini 1.5 Flash", priority: "high" as Priority, points: 8 },
        { id: "k5", title: "Authentication API & Refresh Token rotation", priority: "critical" as Priority, points: 5 },
      ],
    },
    {
      id: "review",
      title: "REVIEW",
      tasks: [
        { id: "k6", title: "User Profile & Skills Portfolio Schema", priority: "medium" as Priority, points: 3 },
      ],
    },
    {
      id: "done",
      title: "DONE",
      tasks: [
        { id: "k7", title: "Next.js App Router project scaffolding", priority: "high" as Priority, points: 3 },
        { id: "k8", title: "FastAPI REST backend endpoints setup", priority: "medium" as Priority, points: 5 },
      ],
    },
  ];

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-6 animate-fade-in">
      {/* Header */}
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

        {/* Project Selector */}
        <div className="flex items-center gap-3">
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="bg-nexus-900 border border-white/[0.1] rounded-lg px-3 py-1.5 text-xs text-zinc-200 outline-none font-medium focus:border-indigo-500/50"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.progress}%)
              </option>
            ))}
          </select>

          <div className="flex items-center bg-nexus-900 border border-white/[0.08] rounded-lg p-0.5 text-xs">
            <button
              onClick={() => setActiveTab("kanban")}
              className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                activeTab === "kanban" ? "bg-white/[0.1] text-zinc-100" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Kanban
            </button>
            <button
              onClick={() => setActiveTab("dependency")}
              className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                activeTab === "dependency" ? "bg-white/[0.1] text-zinc-100" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Dependency Graph
            </button>
          </div>
        </div>
      </div>

      {/* Project Overview Card */}
      {currentProject && (
        <div className="p-5 rounded-xl border border-white/[0.08] bg-nexus-900/60 backdrop-blur-sm space-y-4">
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
                  className="flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300"
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
              <span className="font-bold text-indigo-400">{currentProject.progress}%</span>
            </div>
            <div className="w-full bg-white/[0.06] h-2 rounded-full overflow-hidden">
              <div
                className="bg-indigo-500 h-full rounded-full transition-all duration-500"
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
            <div key={col.id} className="p-3.5 rounded-xl border border-white/[0.08] bg-nexus-900/40 space-y-3 flex flex-col">
              <div className="flex items-center justify-between pb-1 border-b border-white/[0.06]">
                <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-zinc-400">
                  {col.title}
                </span>
                <span className="text-[10px] font-mono text-zinc-500 bg-white/[0.06] px-1.5 py-0.5 rounded">
                  {col.tasks.length}
                </span>
              </div>

              <div className="space-y-2 flex-1">
                {col.tasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-3 rounded-lg bg-nexus-950/80 border border-white/[0.06] hover:border-indigo-500/40 transition-all cursor-pointer space-y-2 group shadow-sm"
                  >
                    <p className="text-xs font-medium text-zinc-200 group-hover:text-white leading-snug">
                      {task.title}
                    </p>
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <Badge variant={task.priority === "critical" ? "destructive" : task.priority === "high" ? "warning" : "secondary"}>
                        {task.priority}
                      </Badge>
                      <span className="text-zinc-500">{task.points} pts</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View 2: Project Dependency Graph */}
      {activeTab === "dependency" && (
        <div className="p-6 rounded-xl border border-white/[0.08] bg-nexus-900/40 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-zinc-200">Module Dependency Visualizer</h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Click any architectural node to see specifications and downstream dependencies
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs text-zinc-400">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Completed</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> In Progress</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-zinc-600" /> Pending</span>
            </div>
          </div>

          {/* Interactive Visual Graph Nodes */}
          <div className="p-8 rounded-lg bg-nexus-950 border border-white/[0.06] flex flex-col items-center space-y-6 overflow-x-auto">
            {/* Level 1: Auth */}
            <div
              onClick={() => setSelectedNode("node-1")}
              className={`px-5 py-3 rounded-lg border cursor-pointer transition-all text-xs font-mono font-medium ${
                selectedNode === "node-1" ? "border-indigo-400 ring-2 ring-indigo-500/20" : "border-emerald-500/30"
              } bg-emerald-950/20 text-emerald-300 shadow-md`}
            >
              Authentication (OAuth / JWT Session) ✓
            </div>

            <div className="w-px h-6 bg-white/[0.1]" />

            {/* Level 2: User Profile */}
            <div
              onClick={() => setSelectedNode("node-2")}
              className={`px-5 py-3 rounded-lg border cursor-pointer transition-all text-xs font-mono font-medium ${
                selectedNode === "node-2" ? "border-indigo-400 ring-2 ring-indigo-500/20" : "border-emerald-500/30"
              } bg-emerald-950/20 text-emerald-300 shadow-md`}
            >
              User Profile & Portfolio Store ✓
            </div>

            <div className="w-px h-6 bg-white/[0.1]" />

            {/* Level 3: REST API */}
            <div
              onClick={() => setSelectedNode("node-3")}
              className={`px-5 py-3 rounded-lg border cursor-pointer transition-all text-xs font-mono font-medium ${
                selectedNode === "node-3" ? "border-indigo-400 ring-2 ring-indigo-500/20" : "border-emerald-500/30"
              } bg-emerald-950/20 text-emerald-300 shadow-md`}
            >
              FastAPI REST API Service ✓
            </div>

            <div className="w-px h-6 bg-white/[0.1]" />

            {/* Level 4: Branches */}
            <div className="grid grid-cols-2 gap-8 w-full max-w-lg">
              <div
                onClick={() => setSelectedNode("node-4")}
                className={`p-3 rounded-lg border cursor-pointer transition-all text-xs font-mono font-medium text-center ${
                  selectedNode === "node-4" ? "border-indigo-400 ring-2 ring-indigo-500/20" : "border-indigo-500/40"
                } bg-indigo-950/30 text-indigo-300 shadow-md`}
              >
                PDF Resume Parser (Gemini) ⏳
              </div>

              <div
                onClick={() => setSelectedNode("node-db")}
                className={`p-3 rounded-lg border cursor-pointer transition-all text-xs font-mono font-medium text-center border-emerald-500/30 bg-emerald-950/20 text-emerald-300 shadow-md`}
              >
                PostgreSQL & pgvector ✓
              </div>
            </div>

            <div className="w-px h-6 bg-white/[0.1]" />

            {/* Level 5: Skill Extraction */}
            <div
              onClick={() => setSelectedNode("node-5")}
              className={`px-5 py-3 rounded-lg border cursor-pointer transition-all text-xs font-mono font-medium ${
                selectedNode === "node-5" ? "border-indigo-400 ring-2 ring-indigo-500/20" : "border-indigo-500/40"
              } bg-indigo-950/30 text-indigo-300 shadow-md`}
            >
              Skill Gap Extraction Pipeline ⏳
            </div>

            <div className="w-px h-6 bg-white/[0.1]" />

            {/* Level 6: Recommendation */}
            <div
              onClick={() => setSelectedNode("node-6")}
              className={`px-5 py-3 rounded-lg border cursor-pointer transition-all text-xs font-mono font-medium ${
                selectedNode === "node-6" ? "border-indigo-400 ring-2 ring-indigo-500/20" : "border-white/[0.1]"
              } bg-nexus-900 text-zinc-400 shadow-md`}
            >
              Automated Interview Recommendation Engine (Pending)
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
