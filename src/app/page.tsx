"use client";

import { useState, useMemo } from "react";
import { useNexusStore } from "@/lib/data/store";
import { compute14DayWorkload, getPeakWorkloadDay } from "@/lib/engines/workloadRadar";
import { recommendNextTask } from "@/lib/engines/recommendation";
import { TodayFocusTimeline } from "@/components/dashboard/TodayFocusTimeline";
import { WorkloadRadar } from "@/components/dashboard/WorkloadRadar";
import { NextMoveCard } from "@/components/dashboard/NextMoveCard";
import { AiBriefingCard } from "@/components/dashboard/AiBriefingCard";
import { ActiveProjectsCard } from "@/components/dashboard/ActiveProjectsCard";
import { ExamModeBanner } from "@/components/dashboard/ExamModeBanner";
import { BuildModeBanner } from "@/components/dashboard/BuildModeBanner";
import { ItemDetailDrawer } from "@/components/dashboard/ItemDetailDrawer";
import { UnifiedItem } from "@/lib/types";
import { format, isSameDay, parseISO } from "date-fns";

export default function CommandCenterDashboard() {
  const {
    items,
    projects,
    mode,
    githubStats,
    toggleItemCompletion,
    deleteItem,
  } = useNexusStore();

  const [selectedItem, setSelectedItem] = useState<UnifiedItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [recommendTick, setRecommendTick] = useState(0);

  // Dynamic time greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning.";
    if (hour < 17) return "Good afternoon.";
    return "Good evening.";
  }, []);

  const currentDateString = useMemo(() => {
    return format(new Date(), "MMMM d, yyyy");
  }, []);

  // Compute 14-day workload
  const workloadDays = useMemo(() => compute14DayWorkload(items), [items]);
  const peakDay = useMemo(() => getPeakWorkloadDay(workloadDays), [workloadDays]);

  // Compute next recommended task
  const nextMove = useMemo(() => {
    return recommendNextTask(items, mode, new Date());
  }, [items, mode, recommendTick]);

  // Today items for timeline: strictly filter items scheduled or due today
  const todayItems = useMemo(() => {
    const today = new Date();
    return items.filter((item) => {
      if (item.startAt) {
        try {
          if (isSameDay(parseISO(item.startAt), today)) return true;
        } catch {}
      }
      if (item.dueAt) {
        try {
          if (isSameDay(parseISO(item.dueAt), today)) return true;
        } catch {}
      }
      return false;
    });
  }, [items]);

  const handleOpenItem = (item: UnifiedItem) => {
    setSelectedItem(item);
    setDrawerOpen(true);
  };

  const pendingCount = items.filter((i) => i.status !== "completed").length;
  const deadlineCount = items.filter(
    (i) => (i.priority === "critical" || i.category === "academic") && i.status !== "completed"
  ).length;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8 animate-fade-in">
      {/* 1. Header Greeting */}
      <div className="border-b border-zinc-800 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="text-xs font-mono font-medium text-zinc-400 tracking-wider uppercase">
            COMMAND CENTER
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mt-1">
            {greeting}
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            You have <strong className="text-zinc-200">{pendingCount} active tasks</strong>.{" "}
            <strong className="text-white font-semibold">{deadlineCount} deadlines</strong> require attention today.
          </p>
        </div>

        <div className="text-left md:text-right">
          <div className="text-xs font-mono text-zinc-400">{currentDateString}</div>
          <div className="text-[11px] font-mono text-zinc-500 mt-0.5">NEXUS Core v1.0.0</div>
        </div>
      </div>

      {/* 2. Global Mode Dynamic Banner (if Exam or Build Mode active) */}
      {mode === "exam" && (
        <ExamModeBanner items={items} onSelectItem={handleOpenItem} />
      )}

      {mode === "build" && (
        <BuildModeBanner projects={projects} githubStats={githubStats} />
      )}

      {/* 3. Main Dashboard 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Primary Column (7 cols): What should I do now + Today's Focus + Workload Radar */}
        <div className="lg:col-span-7 space-y-8">
          {/* What Should I Do Now? Card */}
          <NextMoveCard
            recommendation={nextMove}
            onRefresh={() => setRecommendTick((t) => t + 1)}
            onSelectTask={handleOpenItem}
          />

          {/* Today's Focus Unified Timeline */}
          <TodayFocusTimeline
            items={todayItems}
            onToggleStatus={toggleItemCompletion}
            onSelectItem={handleOpenItem}
          />

          {/* 14-Day Workload Radar */}
          <WorkloadRadar
            days={workloadDays}
            peakDay={peakDay}
            onSelectDayItem={handleOpenItem}
          />
        </div>

        {/* Right Secondary Column (5 cols): AI Daily Brief + Active Projects + Momentum */}
        <div className="lg:col-span-5 space-y-8">
          {/* AI Daily Brief */}
          <AiBriefingCard
            items={todayItems}
            heaviestDayName={peakDay ? peakDay.dayLabel : "Thursday"}
            onSelectItem={handleOpenItem}
          />

          {/* Active Projects & Momentum */}
          <ActiveProjectsCard projects={projects} />
        </div>
      </div>

      {/* Item Detail Drawer */}
      <ItemDetailDrawer
        item={selectedItem}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onToggleStatus={toggleItemCompletion}
        onDelete={deleteItem}
      />
    </div>
  );
}
