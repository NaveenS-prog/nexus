"use client";

import { Hammer, GitBranch, GitPullRequest, GitCommit, ArrowRight, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Project } from "@/lib/types";

interface BuildModeBannerProps {
  projects: Project[];
  githubStats: {
    commitsThisWeek: number;
    pullRequests: number;
    issuesClosed: number;
    streakDays: number;
  };
}

export function BuildModeBanner({ projects, githubStats }: BuildModeBannerProps) {
  const activeSprintProject = projects[0] || {
    name: "AI Placement Platform",
    progress: 80,
    githubRepo: "navee/ai-placement-platform"
  };

  return (
    <div className="rounded-xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/25 via-nexus-900 to-indigo-950/10 p-5 space-y-4 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <Hammer className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold tracking-wider text-indigo-300 uppercase font-mono">
                BUILD MODE ACTIVE
              </h2>
              <Badge variant="default">Sprint Focus</Badge>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Active repository sprints, in-progress architecture tasks, and GitHub stats prioritized
            </p>
          </div>
        </div>

        {/* GitHub stats pill */}
        <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 rounded-lg bg-nexus-950/80 border border-white/[0.08] text-xs text-zinc-300">
          <div className="flex items-center gap-1.5">
            <GitCommit className="w-3.5 h-3.5 text-indigo-400" />
            <span>{githubStats.commitsThisWeek} commits</span>
          </div>
          <span className="text-zinc-600">|</span>
          <div className="flex items-center gap-1.5">
            <GitPullRequest className="w-3.5 h-3.5 text-emerald-400" />
            <span>{githubStats.pullRequests} PRs</span>
          </div>
        </div>
      </div>

      {/* Active Sprint Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
        {/* Sprint Overview */}
        <div className="p-3.5 rounded-lg bg-nexus-950/80 border border-indigo-500/20 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-zinc-200">{activeSprintProject.name}</span>
            <span className="font-mono text-indigo-400 font-bold">{activeSprintProject.progress}%</span>
          </div>

          {/* Linear-style Progress bar */}
          <div className="w-full bg-white/[0.08] h-2 rounded-full overflow-hidden">
            <div 
              className="bg-indigo-500 h-full rounded-full transition-all duration-500" 
              style={{ width: `${activeSprintProject.progress}%` }} 
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-zinc-500 font-mono">
            <span>Sprint 3 / MVP</span>
            <span>repo: {activeSprintProject.githubRepo || "internal"}</span>
          </div>
        </div>

        {/* In Progress */}
        <div className="p-3.5 rounded-lg bg-nexus-950/80 border border-white/[0.08] space-y-2 text-xs">
          <div className="text-[10px] uppercase font-mono tracking-wider text-indigo-400 font-semibold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            IN PROGRESS
          </div>
          <p className="font-semibold text-zinc-100">Authentication API & JWT Middleware</p>
          <p className="text-[11px] text-zinc-400">Tokens, cookie rotation, and route guard hooks</p>
        </div>

        {/* Next & Backlog */}
        <div className="p-3.5 rounded-lg bg-nexus-950/80 border border-white/[0.08] space-y-2 text-xs">
          <div className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 font-semibold">
            NEXT ON RADAR
          </div>
          <p className="font-medium text-zinc-200">PDF Resume Parser Engine (Gemini API)</p>
          <div className="flex items-center gap-2 text-[10px] text-zinc-500">
            <span>Backlog: Skill extraction</span>
            <span>•</span>
            <span>Recommendation engine</span>
          </div>
        </div>
      </div>
    </div>
  );
}
