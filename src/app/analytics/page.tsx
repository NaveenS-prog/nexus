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
    { category: "Academic Coursework", count: 8, color: "bg-olive" },
    { category: "Software Projects", count: 6, color: "bg-stone-500" },
    { category: "Personal & DSA", count: 4, color: "bg-stone-400" },
    { category: "Calendar Sessions", count: 5, color: "bg-olive-light" },
  ];

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-8 animate-fade-in text-ink">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-hairline pb-6">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-olive" />
            <h1 className="text-2xl font-serif font-semibold tracking-tight text-ink">Activity & Focus Analytics</h1>
          </div>
          <p className="text-xs text-ink-muted mt-1">
            Tracking execution throughput, focus sessions, and sprint momentum
          </p>
        </div>

        <Badge variant="parchment" className="font-mono text-xs">
          Week of September 20
        </Badge>
      </div>

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-hairline bg-surface space-y-1">
          <div className="flex items-center justify-between text-xs text-ink-muted">
            <span>Tasks Completed</span>
            <CheckCircle2 className="w-4 h-4 text-olive" />
          </div>
          <div className="text-2xl font-serif font-semibold text-ink">37</div>
          <span className="text-[11px] text-ink-muted font-mono">+12% vs last week</span>
        </div>

        <div className="p-4 rounded-xl border border-hairline bg-surface space-y-1">
          <div className="flex items-center justify-between text-xs text-ink-muted">
            <span>Focused Time</span>
            <Clock className="w-4 h-4 text-olive" />
          </div>
          <div className="text-2xl font-serif font-semibold text-ink">14h 20m</div>
          <span className="text-[11px] text-ink-muted font-mono">18 completed sessions</span>
        </div>

        <div className="p-4 rounded-xl border border-hairline bg-surface space-y-1">
          <div className="flex items-center justify-between text-xs text-ink-muted">
            <span>Active Day Streak</span>
            <Flame className="w-4 h-4 text-terracotta" />
          </div>
          <div className="text-2xl font-serif font-semibold text-ink">6 Days</div>
          <span className="text-[11px] text-ink-muted font-mono">Personal best: 14 days</span>
        </div>

        <div className="p-4 rounded-xl border border-hairline bg-surface space-y-1">
          <div className="flex items-center justify-between text-xs text-ink-muted">
            <span>Completion Rate</span>
            <TrendingUp className="w-4 h-4 text-olive" />
          </div>
          <div className="text-2xl font-serif font-semibold text-ink">82%</div>
          <span className="text-[11px] text-ink-muted font-mono">High execution score</span>
        </div>
      </div>

      {/* Weekly Chart */}
      <div className="p-5 rounded-xl border border-hairline bg-surface space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-serif font-semibold text-ink">Daily Focus Hours & Tasks Completed</span>
          <div className="flex items-center gap-4 text-xs font-mono text-ink-muted">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-olive" /> Focus Hours</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-stone-300" /> Tasks</span>
          </div>
        </div>

        <div className="h-64 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyActivityData}>
              <XAxis dataKey="day" stroke="#9A958B" fontSize={12} tickLine={false} />
              <YAxis stroke="#9A958B" fontSize={12} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#FBFAF7",
                  borderColor: "#DDD8CF",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "#171717",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                }}
              />
              <Bar dataKey="focusHours" fill="#4D5A45" radius={[4, 4, 0, 0]} name="Focus Hours" />
              <Bar dataKey="tasks" fill="#D4CEBE" radius={[4, 4, 0, 0]} name="Tasks Done" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Distribution by Category */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 rounded-xl border border-hairline bg-surface space-y-3">
          <span className="text-xs font-serif font-semibold text-ink">Activity Distribution by Domain</span>
          <div className="space-y-3 pt-1">
            {categoryBreakdown.map((cat) => (
              <div key={cat.category} className="space-y-1">
                <div className="flex items-center justify-between text-xs text-ink-secondary">
                  <span>{cat.category}</span>
                  <span className="font-mono text-ink-muted">{cat.count} items</span>
                </div>
                <div className="w-full bg-canvas-secondary h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`${cat.color} h-full rounded-full`}
                    style={{ width: `${(cat.count / 23) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-5 rounded-xl border border-hairline bg-surface flex flex-col justify-between">
          <div>
            <span className="text-xs font-serif font-semibold text-ink">Activity Philosophy</span>
            <p className="text-xs text-ink-secondary mt-2 leading-relaxed">
              These metrics measure quantified interaction and throughput. They represent activity, not intrinsic worth or creative depth. Use them to maintain calm forward momentum without burnout.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-canvas border border-hairline text-[11px] font-mono text-ink-muted mt-4">
            Total recorded focus time: <strong className="text-ink font-semibold">14 hours, 20 minutes</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
