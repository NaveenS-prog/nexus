"use client";

import Link from "next/link";
import { Rocket, Flame, Clock, CheckCircle2, ChevronRight } from "lucide-react";
import { Project } from "@/lib/types";

interface ActiveProjectsCardProps {
  projects: Project[];
}

export function ActiveProjectsCard({ projects }: ActiveProjectsCardProps) {
  return (
    <div className="space-y-4">
      {/* Active Projects List */}
      <div className="rounded-xl border border-zinc-200/90 bg-white/90 backdrop-blur-md p-4 space-y-3 shadow-[0_1px_3px_rgba(0,0,0,0.03),0_8px_24px_rgba(0,0,0,0.02)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Rocket className="w-4 h-4 text-zinc-950" />
            <h2 className="text-sm font-semibold tracking-tight text-zinc-950 uppercase font-mono">
              Active Projects
            </h2>
          </div>
          <Link href="/projects" className="text-xs text-zinc-500 hover:text-zinc-950 flex items-center gap-1 font-medium transition-colors">
            <span>View All</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="space-y-3">
          {projects.length === 0 ? (
            <div className="py-6 text-center text-xs text-zinc-400">
              No active projects. Connect Notion in Settings or create a project!
            </div>
          ) : (
            projects.map((proj) => (
              <div key={proj.id} className="space-y-1.5 group cursor-pointer">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-zinc-800 group-hover:text-zinc-950 transition-colors">
                    {proj.name}
                  </span>
                  <span className="font-mono text-zinc-950 font-bold">{proj.progress}%</span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-zinc-100 h-1.5 rounded-full overflow-hidden border border-zinc-200/50">
                  <div
                    className="bg-zinc-950 h-full rounded-full transition-all duration-300"
                    style={{ width: `${proj.progress}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                  <span>{proj.completedTasksCount}/{proj.tasksCount} tasks completed</span>
                  <span>repo: {proj.githubRepo?.split("/")[1] || "repo"}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Productivity Momentum Strip */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="p-3 rounded-xl bg-white/90 border border-zinc-200/90 flex flex-col items-center justify-center text-center shadow-xs">
          <div className="flex items-center gap-1 text-zinc-950">
            <Flame className="w-4 h-4 text-amber-500" />
            <span className="text-base font-bold font-mono text-zinc-950">6</span>
          </div>
          <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-mono mt-0.5">Day Streak</span>
        </div>

        <div className="p-3 rounded-xl bg-white/90 border border-zinc-200/90 flex flex-col items-center justify-center text-center shadow-xs">
          <div className="flex items-center gap-1 text-zinc-950">
            <Clock className="w-4 h-4 text-zinc-950" />
            <span className="text-base font-bold font-mono text-zinc-950">14.3h</span>
          </div>
          <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-mono mt-0.5">Focus Time</span>
        </div>

        <div className="p-3 rounded-xl bg-white/90 border border-zinc-200/90 flex flex-col items-center justify-center text-center shadow-xs">
          <div className="flex items-center gap-1 text-zinc-950">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="text-base font-bold font-mono text-zinc-950">37</span>
          </div>
          <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-mono mt-0.5">Completed</span>
        </div>
      </div>
    </div>
  );
}
