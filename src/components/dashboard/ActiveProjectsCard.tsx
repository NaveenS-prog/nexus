"use client";

import Link from "next/link";
import { FolderKanban, ChevronRight, CheckCircle2 } from "lucide-react";
import { Project } from "@/lib/types";

interface ActiveProjectsCardProps {
  projects: Project[];
}

export function ActiveProjectsCard({ projects }: ActiveProjectsCardProps) {
  return (
    <div className="space-y-4 font-sans">
      {/* Section Header */}
      <div className="flex items-baseline justify-between border-b border-hairline pb-2">
        <h3 className="text-xs font-mono uppercase tracking-wider text-ink-secondary font-medium">
          Work In Progress · Projects
        </h3>
        <Link 
          href="/projects" 
          className="text-[11px] font-mono text-ink-muted hover:text-ink transition-colors flex items-center gap-1"
        >
          <span>All ({projects.length})</span>
          <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Projects List */}
      {projects.length === 0 ? (
        <div className="py-6 text-center text-xs text-ink-muted font-sans">
          No active projects in progress.
        </div>
      ) : (
        <div className="space-y-3.5">
          {projects.map((proj) => (
            <div key={proj.id} className="space-y-1.5 group cursor-pointer">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-ink group-hover:text-olive transition-colors">
                  {proj.name}
                </span>
                <span className="font-mono text-[11px] text-ink-muted">{proj.progress}%</span>
              </div>

              {/* Minimal Progress Bar */}
              <div className="w-full bg-hairline h-1 rounded-full overflow-hidden">
                <div
                  className="bg-olive h-full rounded-full transition-all duration-300"
                  style={{ width: `${proj.progress}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-ink-muted font-mono">
                <span>{proj.completedTasksCount}/{proj.tasksCount} tasks completed</span>
                {proj.description && <span className="truncate max-w-[160px]">{proj.description}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Productivity Momentum Strip (Quiet & Grounded) */}
      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-hairline-subtle">
        <div className="p-2.5 rounded-sm bg-surface border border-hairline text-center">
          <span className="text-sm font-semibold font-mono text-ink block">6d</span>
          <span className="text-[10px] text-ink-muted uppercase tracking-wider font-mono">Streak</span>
        </div>

        <div className="p-2.5 rounded-sm bg-surface border border-hairline text-center">
          <span className="text-sm font-semibold font-mono text-ink block">14.3h</span>
          <span className="text-[10px] text-ink-muted uppercase tracking-wider font-mono">Focus</span>
        </div>

        <div className="p-2.5 rounded-sm bg-surface border border-hairline text-center">
          <span className="text-sm font-semibold font-mono text-ink block">37</span>
          <span className="text-[10px] text-ink-muted uppercase tracking-wider font-mono">Done</span>
        </div>
      </div>
    </div>
  );
}
