"use client";

import { useState } from "react";
import { 
  BarChart3, 
  Flame, 
  Clock, 
  CheckCircle2, 
  TrendingUp
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
    { category: "Academic Coursework", count: 8, color: "bg-zinc-950" },
    { category: "Software Projects", count: 6, color: "bg-zinc-700" },
    { category: "Personal & DSA", count: 4, color: "bg-zinc-500" },
    { category: "Calendar Sessions", count: 5, color: "bg-zinc-400" },
  ];

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200/90 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-zinc-950" />
            <h1 className="text-2xl font-bold tracking-tight text-zinc-950">Activity & Focus Analytics</h1>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Tracking execution throughput, focus sessions, and sprint momentum
          </p>
        </div>

        <Badge variant="secondary" className="font-mono text-xs">
          Week of September 20
        </Badge>
      </div>

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-zinc-200/90 bg-white/90 backdrop-blur-md space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>Tasks Completed</span>
            <CheckCircle2 className="w-4 h-4 text-zinc-950" />
          </div>
          <div className="text-2xl font-bold font-mono text-zinc-950">37</div>
          <span className="text-[11px] text-zinc-500 font-mono">+12% vs last week</span>
        </div>

        <div className="p-4 rounded-xl border border-zinc-200/90 bg-white/90 backdrop-blur-md space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>Focused Time</span>
            <Clock className="w-4 h-4 text-zinc-950" />
          </div>
          <div className="text-2xl font-bold font-mono text-zinc-950">14h 20m</div>
          <span className="text-[11px] text-zinc-500 font-mono">18 completed sessions</span>
        </div>

        <div className="p-4 rounded-xl border border-zinc-200/90 bg-white/90 backdrop-blur-md space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>Active Day Streak</span>
            <Flame className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-zinc-950">6 Days</div>
          <span className="text-[11px] text-zinc-500 font-mono">Personal best: 14 days</span>
        </div>

        <div className="p-4 rounded-xl border border-zinc-200/90 bg-white/90 backdrop-blur-md space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>Completion Rate</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-zinc-950">82%</div>
          <span className="text-[11px] text-zinc-500 font-mono">High execution score</span>
        </div>
      </div>

      {/* Weekly Chart */}
      <div className="p-5 rounded-xl border border-zinc-200/90 bg-white/90 backdrop-blur-md space-y-4 shadow-[0_1px_3px_rgba(0,0,0,0.03),0_8px_24px_rgba(0,0,0,0.02)]">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-zinc-950">Daily Focus Hours & Tasks Completed</span>
          <div className="flex items-center gap-4 text-xs font-mono text-zinc-500">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-zinc-950" /> Focus Hours</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-zinc-400" /> Tasks</span>
          </div>
        </div>

        <div className="h-64 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyActivityData}>
              <XAxis dataKey="day" stroke="#a1a1aa" fontSize={12} tickLine={false} />
              <YAxis stroke="#a1a1aa" fontSize={12} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  borderColor: "#e4e4e7",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "#09090b",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)"
                }}
              />
              <Bar dataKey="focusHours" fill="#09090b" radius={[4, 4, 0, 0]} name="Focus Hours" />
              <Bar dataKey="tasks" fill="#a1a1aa" radius={[4, 4, 0, 0]} name="Tasks Done" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Distribution by Category */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl border border-zinc-200/90 bg-white/90 backdrop-blur-md space-y-3 shadow-xs">
          <span className="text-xs font-semibold text-zinc-950">Activity Distribution by Domain</span>
          <div className="space-y-2.5 pt-1">
            {categoryBreakdown.map((cat) => (
              <div key={cat.category} className="space-y-1">
                <div className="flex items-center justify-between text-xs text-zinc-700">
                  <span>{cat.category}</span>
                  <span className="font-mono text-zinc-500">{cat.count} items</span>
                </div>
                <div className="w-full bg-zinc-100 h-1.5 rounded-full overflow-hidden border border-zinc-200/50">
                  <div
                    className={`${cat.color} h-full rounded-full`}
                    style={{ width: `${(cat.count / 23) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 rounded-xl border border-zinc-200/90 bg-white/90 backdrop-blur-md flex flex-col justify-between shadow-xs">
          <div>
            <span className="text-xs font-semibold text-zinc-950">Activity Disclaimer</span>
            <p className="text-xs text-zinc-600 mt-2 leading-relaxed">
              These metrics measure quantified interaction and throughput. They represent activity, not intrinsic worth or creative insight. Use them to maintain gentle forward momentum without burnout.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200 text-[11px] font-mono text-zinc-600 mt-4">
            Total recorded focus time: <strong className="text-zinc-950">14 hours, 20 minutes</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
