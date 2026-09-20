"use client";

import { useState } from "react";
import { Sparkles, ArrowRight, Clock, AlertTriangle, CheckSquare } from "lucide-react";
import { DailyBriefing, UnifiedItem } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

interface AiBriefingCardProps {
  items: UnifiedItem[];
  heaviestDayName?: string;
  onSelectItem?: (item: UnifiedItem) => void;
}

export function AiBriefingCard({ items, heaviestDayName = "Thursday", onSelectItem }: AiBriefingCardProps) {
  const pendingTasks = items.filter((i) => i.status !== "completed" && i.category !== "calendar");
  const deadlines = items.filter((i) => i.priority === "critical" || (i.category === "academic" && i.status !== "completed"));
  const totalMinutes = pendingTasks.reduce((sum, i) => sum + (i.estimatedMinutes || 45), 0);

  // Recommended order: critical/high first
  const recommended = [...pendingTasks]
    .sort((a, b) => {
      const pWeight = { critical: 4, high: 3, medium: 2, low: 1 };
      return pWeight[b.priority] - pWeight[a.priority];
    })
    .slice(0, 4);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-white text-black">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 font-bold">
              AI DAILY BRIEF
            </span>
            <h3 className="text-xs font-semibold text-zinc-200 mt-0.5">
              Synthesis & Recommended Attack Order
            </h3>
          </div>
        </div>

        <Badge variant="outline" className="font-mono text-[10px]">
          {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m focus
        </Badge>
      </div>

      {/* Synthesis Bullets */}
      <div className="space-y-1.5 text-xs text-zinc-300">
        <p className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-white" />
          <span>You have <strong className="text-white font-mono">{pendingTasks.length} tasks</strong> scheduled today.</span>
        </p>
        <p className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
          <span><strong className="text-white font-mono">{deadlines.length} deadlines</strong> require your immediate attention.</span>
        </p>
        <p className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
          <span>Your heaviest upcoming workload collides on <strong className="text-white font-mono">{heaviestDayName}</strong>.</span>
        </p>
      </div>

      {/* Recommended Attack Order */}
      <div className="pt-2 border-t border-zinc-800 space-y-2">
        <span className="text-[10px] uppercase font-mono text-zinc-500 font-semibold tracking-wider">
          Recommended Order of Attack:
        </span>

        <div className="space-y-1.5">
          {recommended.map((task, idx) => (
            <div
              key={task.id}
              onClick={() => onSelectItem && onSelectItem(task)}
              className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-between text-xs hover:border-white cursor-pointer transition-colors group"
            >
              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                <span className="w-5 h-5 rounded-full bg-white text-black flex items-center justify-center font-mono text-[10px] font-bold flex-shrink-0">
                  {idx + 1}
                </span>
                <span className="text-zinc-200 truncate group-hover:text-white font-medium">
                  {task.title}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 text-[10px] text-zinc-500 font-mono">
                <span className="capitalize">{task.category}</span>
                <span>•</span>
                <span>{task.estimatedMinutes || 45}m</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
