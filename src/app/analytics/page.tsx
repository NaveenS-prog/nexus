"use client";

import { useState } from "react";
import { 
  BarChart3, 
  Flame, 
  Clock, 
  CheckCircle2, 
  Rocket, 
  TrendingUp,
  Calendar
} from "lucide-react";
import { useNexusStore } from "@/lib/data/store";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area,
} from "recharts";

export default function AnalyticsPage() {
  const { focusSessions, items, projects } = useNexusStore();

  const weeklyActivityData = [
    { day: "Mon", tasks: 6, focusHours: 2.5, commits: 3 },
    { day: "Tue", tasks: 8, focusHours: 3.2, commits: 5 },
    { day: "Wed", tasks: 5, focusHours: 1.8, commits: 2 },
    { day: "Thu", tasks: 9, focusHours: 4.1, commits: 4 },
    { day: "Fri", tasks: 7, focusHours: 3.0, commits: 3 },
    { day: "Sat", tasks: 4, focusHours: 1.5, commits: 1 },
    { day: "Sun", tasks: 3, focusHours: 1.2, commits: 0 },
  ];

  const categoryBreakdown = [
    { category: "Academic Coursework", count: 8, color: "bg-white" },
    { category: "Software Projects", count: 6, color: "bg-zinc-400" },
    { category: "Personal & DSA", count: 4, color: "bg-zinc-600" },
    { category: "Calendar Sessions", count: 5, color: "bg-zinc-300" },
  ];

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-white" />
            <h1 className="text-2xl font-bold tracking-tight text-white">Activity & Focus Analytics</h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Tracking execution throughput, focus sessions, and sprint momentum (Activity Metrics)
          </p>
        </div>

        <Badge variant="secondary" className="font-mono text-xs">
          Week of September 20
        </Badge>
      </div>

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950 space-y-1">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Tasks Completed</span>
            <CheckCircle2 className="w-4 h-4 text-white" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">37</div>
          <span className="text-[11px] text-zinc-400 font-mono">+12% vs last week</span>
        </div>

        <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950 space-y-1">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Focused Time</span>
            <Clock className="w-4 h-4 text-white" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">14h 20m</div>
          <span className="text-[11px] text-zinc-400 font-mono">18 completed sessions</span>
        </div>

        <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950 space-y-1">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Active Day Streak</span>
            <Flame className="w-4 h-4 text-white" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">6 Days</div>
          <span className="text-[11px] text-zinc-400 font-mono">Personal best: 14 days</span>
        </div>

        <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950 space-y-1">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Completion Rate</span>
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">82%</div>
          <span className="text-[11px] text-zinc-400 font-mono">High execution score</span>
        </div>
      </div>

      {/* Weekly Chart */}
      <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-950 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-zinc-200">Daily Focus Hours & Tasks Completed</span>
          <div className="flex items-center gap-4 text-xs font-mono text-zinc-400">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-white" /> Focus Hours</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-zinc-600" /> Tasks</span>
          </div>
        </div>

        <div className="h-64 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyActivityData}>
              <XAxis dataKey="day" stroke="#71717A" fontSize={12} tickLine={false} />
              <YAxis stroke="#71717A" fontSize={12} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#09090b",
                  borderColor: "#27272a",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "#ffffff"
                }}
              />
              <Bar dataKey="focusHours" fill="#ffffff" radius={[4, 4, 0, 0]} name="Focus Hours" />
              <Bar dataKey="tasks" fill="#52525b" radius={[4, 4, 0, 0]} name="Tasks Done" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Distribution by Category */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950 space-y-3">
          <span className="text-xs font-semibold text-zinc-200">Activity Distribution by Domain</span>
          <div className="space-y-2.5 pt-1">
            {categoryBreakdown.map((cat) => (
              <div key={cat.category} className="space-y-1">
                <div className="flex items-center justify-between text-xs text-zinc-300">
                  <span>{cat.category}</span>
                  <span className="font-mono text-zinc-400">{cat.count} items</span>
                </div>
                <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`${cat.color} h-full rounded-full`}
                    style={{ width: `${(cat.count / 23) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950 flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-zinc-200">Activity Disclaimer</span>
            <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
              These metrics measure quantified interaction and throughput. They represent activity, not intrinsic worth or creative insight. Use them to maintain gentle forward momentum without burnout.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] font-mono text-zinc-400 mt-4">
            Total recorded focus time: <strong className="text-zinc-200">14 hours, 20 minutes</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
