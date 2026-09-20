"use client";

import Link from "next/link";
import { Rocket, Flame, Clock, CheckCircle2, ChevronRight, GitFork } from "lucide-react";
import { Project } from "@/lib/types";

interface ActiveProjectsCardProps {
  projects: Project[];
}

export function ActiveProjectsCard({ projects }: ActiveProjectsCardProps) {
  return (
    <div className="space-y-4">
      {/* Active Projects List */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Rocket className="w-4 h-4 text-white" />
            <h2 className="text-sm font-semibold tracking-tight text-zinc-100 uppercase font-mono">
              Active Projects
            </h2>
          </div>
          <Link href="/projects" className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 font-medium">
            <span>View All</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="space-y-3">
          {projects.length === 0 ? (
            <div className="py-6 text-center text-xs text-zinc-500">
              No active projects. Connect Notion in Settings or create a project!
            </div>
          ) : (
            projects.map((proj) => (
              <div key={proj.id} className="space-y-1.5 group cursor-pointer">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-zinc-200 group-hover:text-white transition-colors">
                    {proj.name}
                  </span>
                  <span className="font-mono text-zinc-400 font-bold">{proj.progress}%</span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-white h-full rounded-full transition-all duration-300"
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
        <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 flex flex-col items-center justify-center text-center">
          <div className="flex items-center gap-1 text-white">
            <Flame className="w-4 h-4 text-white" />
            <span className="text-base font-bold font-mono">6</span>
          </div>
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono mt-0.5">Day Streak</span>
        </div>

        <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 flex flex-col items-center justify-center text-center">
          <div className="flex items-center gap-1 text-white">
            <Clock className="w-4 h-4 text-white" />
            <span className="text-base font-bold font-mono">14.3h</span>
          </div>
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono mt-0.5">Focus Time</span>
        </div>

        <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 flex flex-col items-center justify-center text-center">
          <div className="flex items-center gap-1 text-white">
            <CheckCircle2 className="w-4 h-4 text-white" />
            <span className="text-base font-bold font-mono">37</span>
          </div>
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono mt-0.5">Completed</span>
        </div>
      </div>
    </div>
  );
}
