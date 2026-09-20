"use client";

import { useState } from "react";
import { BarChart2, AlertCircle, Calendar, Clock, ChevronRight } from "lucide-react";
import { WorkloadDay, UnifiedItem } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

interface WorkloadRadarProps {
  days: WorkloadDay[];
  peakDay: WorkloadDay | null;
  onSelectDayItem?: (item: UnifiedItem) => void;
}

export function WorkloadRadar({ days, peakDay, onSelectDayItem }: WorkloadRadarProps) {
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(3); // default highlight peak/crunch
  const activeDay = days[selectedDayIndex] || peakDay || days[0];

  return (
    <div className="space-y-3">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-indigo-400" />
          <h2 className="text-sm font-semibold tracking-tight text-zinc-100 uppercase font-mono">
            14-Day Workload Radar
          </h2>
        </div>
        <span className="text-xs text-zinc-500 font-mono">
          Collision Analysis
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 14-Day Bar Histogram */}
        <div className="lg:col-span-2 rounded-xl border border-white/[0.08] bg-nexus-900/50 backdrop-blur-sm p-4 space-y-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400">Interactive 14-Day Timeline</span>
            <div className="flex items-center gap-3 text-[11px] text-zinc-500">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded bg-indigo-500" /> Normal
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded bg-amber-500" /> High
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded bg-rose-500" /> Crunch Day
              </span>
            </div>
          </div>

          {/* Bars Container */}
          <div className="grid grid-cols-14 gap-1.5 h-36 items-end pt-2 pb-1 border-b border-white/[0.06]">
            {days.map((day, idx) => {
              const isSelected = idx === selectedDayIndex;
              const barHeightPercent = Math.max(14, day.totalScore);
              
              let barColor = "bg-indigo-600/70 hover:bg-indigo-500";
              if (day.totalScore >= 70) {
                barColor = "bg-rose-500/80 hover:bg-rose-400";
              } else if (day.totalScore >= 45) {
                barColor = "bg-amber-500/80 hover:bg-amber-400";
              }

              return (
                <div
                  key={day.date}
                  onClick={() => setSelectedDayIndex(idx)}
                  className="flex flex-col items-center gap-1.5 h-full justify-end cursor-pointer group"
                  title={`${day.formattedDate}: ${day.tasksCount} tasks, ${day.deadlinesCount} deadlines (${day.totalScore}% load)`}
                >
                  <div
                    className={`w-full rounded-t transition-all relative ${barColor} ${
                      isSelected ? "ring-2 ring-indigo-400 ring-offset-2 ring-offset-nexus-950 scale-y-105" : ""
                    }`}
                    style={{ height: `${barHeightPercent}%` }}
                  >
                    {day.isCrunchDay && (
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                    )}
                  </div>
                  <span className={`text-[10px] font-mono leading-none ${isSelected ? "text-indigo-300 font-bold" : "text-zinc-500"}`}>
                    {day.dayLabel.charAt(0)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Selected Day Overview */}
          {activeDay && (
            <div className="flex items-center justify-between text-xs pt-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-zinc-200">{activeDay.formattedDate}</span>
                {activeDay.isToday && <Badge variant="secondary">Today</Badge>}
                {activeDay.isCrunchDay && <Badge variant="destructive">Crunch Day</Badge>}
              </div>

              <div className="flex items-center gap-3 text-zinc-400 text-[11px] font-mono">
                <span>{activeDay.tasksCount} tasks</span>
                <span>•</span>
                <span>{activeDay.deadlinesCount} deadlines</span>
                <span>•</span>
                <span>{Math.floor(activeDay.calendarMinutes / 60)}h {activeDay.calendarMinutes % 60}m load</span>
              </div>
            </div>
          )}
        </div>

        {/* Peak Workload Callout Card */}
        <div className="rounded-xl border border-white/[0.08] bg-nexus-900/50 backdrop-blur-sm p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider">
                PEAK WORKLOAD
              </span>
              <AlertCircle className="w-4 h-4 text-amber-400" />
            </div>

            <div className="mt-2.5">
              <h3 className="text-xl font-bold text-zinc-100 font-mono">
                {peakDay ? peakDay.dayLabel : "Thursday"}
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                {peakDay ? peakDay.formattedDate : "Upcoming peak collision"}
              </p>
            </div>

            {/* Metrics */}
            <div className="mt-4 space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded bg-nexus-950 border border-white/[0.04]">
                <span className="text-zinc-400">Total Tasks</span>
                <span className="font-mono text-zinc-200 font-semibold">{peakDay?.tasksCount || 7} tasks</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-nexus-950 border border-white/[0.04]">
                <span className="text-zinc-400">Deadlines</span>
                <span className="font-mono text-rose-400 font-semibold">{peakDay?.deadlinesCount || 3} deadlines</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-nexus-950 border border-white/[0.04]">
                <span className="text-zinc-400">Estimated Effort</span>
                <span className="font-mono text-amber-400 font-semibold">
                  {peakDay ? `${Math.floor(peakDay.calendarMinutes / 60)}h ${peakDay.calendarMinutes % 60}m` : "5h 40m"}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-3 text-[11px] text-zinc-500 italic">
            Tip: Pre-clear OS Assignment & COA prep before peak collision.
          </div>
        </div>
      </div>
    </div>
  );
}
