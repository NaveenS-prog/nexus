"use client";

import { useState } from "react";
import { BarChart2, AlertCircle } from "lucide-react";
import { WorkloadDay, UnifiedItem } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

interface WorkloadRadarProps {
  days: WorkloadDay[];
  peakDay: WorkloadDay | null;
  onSelectDayItem?: (item: UnifiedItem) => void;
}

export function WorkloadRadar({ days, peakDay, onSelectDayItem }: WorkloadRadarProps) {
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(3);
  const activeDay = days[selectedDayIndex] || peakDay || days[0];

  return (
    <div className="space-y-3">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-zinc-950" />
          <h2 className="text-sm font-semibold tracking-tight text-zinc-950 uppercase font-mono">
            14-Day Workload Radar
          </h2>
        </div>
        <span className="text-xs text-zinc-500 font-mono">
          Collision Analysis
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 14-Day Bar Histogram */}
        <div className="lg:col-span-2 rounded-xl border border-zinc-200/90 bg-white/90 backdrop-blur-md p-4 space-y-4 shadow-[0_1px_3px_rgba(0,0,0,0.03),0_8px_24px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-600 font-medium">Interactive 14-Day Timeline</span>
            <div className="flex items-center gap-3 text-[11px] text-zinc-500 font-mono">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded bg-zinc-200 border border-zinc-300" /> Normal
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded bg-zinc-500" /> High
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded bg-zinc-950" /> Crunch Day
              </span>
            </div>
          </div>

          {/* Bars Container */}
          <div className="grid grid-cols-14 gap-1.5 h-36 items-end pt-2 pb-1 border-b border-zinc-100">
            {days.map((day, idx) => {
              const isSelected = idx === selectedDayIndex;
              const barHeightPercent = Math.max(14, day.totalScore);
              
              let barColor = "bg-zinc-200 hover:bg-zinc-300";
              if (day.totalScore >= 70) {
                barColor = "bg-zinc-950 hover:bg-zinc-800";
              } else if (day.totalScore >= 45) {
                barColor = "bg-zinc-500 hover:bg-zinc-700";
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
                      isSelected ? "ring-2 ring-zinc-950 ring-offset-2 ring-offset-white scale-y-105 shadow-xs" : ""
                    }`}
                    style={{ height: `${barHeightPercent}%` }}
                  >
                    {day.isCrunchDay && (
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                    )}
                  </div>
                  <span className={`text-[10px] font-mono leading-none ${isSelected ? "text-zinc-950 font-bold" : "text-zinc-400 group-hover:text-zinc-700"}`}>
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
                <span className="font-semibold text-zinc-900">{activeDay.formattedDate}</span>
                {activeDay.isToday && <Badge variant="secondary">Today</Badge>}
                {activeDay.isCrunchDay && <Badge variant="destructive">Crunch Day</Badge>}
              </div>

              <div className="flex items-center gap-3 text-zinc-500 text-[11px] font-mono">
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
        <div className="rounded-xl border border-zinc-200/90 bg-white/90 backdrop-blur-md p-4 flex flex-col justify-between shadow-[0_1px_3px_rgba(0,0,0,0.03),0_8px_24px_rgba(0,0,0,0.02)]">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider font-semibold">
                PEAK WORKLOAD
              </span>
              <AlertCircle className="w-4 h-4 text-zinc-950" />
            </div>

            <div className="mt-2.5">
              <h3 className="text-xl font-bold text-zinc-950 font-mono">
                {peakDay ? peakDay.dayLabel : "Thursday"}
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                {peakDay ? peakDay.formattedDate : "Upcoming peak collision"}
              </p>
            </div>

            {/* Metrics */}
            <div className="mt-4 space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-50 border border-zinc-200/80">
                <span className="text-zinc-600 font-medium">Total Tasks</span>
                <span className="font-mono text-zinc-950 font-semibold">{peakDay?.tasksCount || 7} tasks</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-50 border border-zinc-200/80">
                <span className="text-zinc-600 font-medium">Deadlines</span>
                <span className="font-mono text-zinc-950 font-bold">{peakDay?.deadlinesCount || 3} deadlines</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-50 border border-zinc-200/80">
                <span className="text-zinc-600 font-medium">Estimated Effort</span>
                <span className="font-mono text-zinc-950 font-semibold">
                  {peakDay ? `${Math.floor(peakDay.calendarMinutes / 60)}h ${peakDay.calendarMinutes % 60}m` : "5h 40m"}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-3 text-[11px] text-zinc-400 italic">
            Tip: Pre-clear critical tasks before upcoming peak collision.
          </div>
        </div>
      </div>
    </div>
  );
}
