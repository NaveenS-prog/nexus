"use client";

import { useState, useMemo } from "react";
import { useNexusStore } from "@/lib/data/store";
import { recommendNextTask } from "@/lib/engines/recommendation";
import { TodayFocusTimeline } from "@/components/dashboard/TodayFocusTimeline";
import { UpcomingExamsAndAssignments } from "@/components/dashboard/UpcomingExamsAndAssignments";
import { NextMoveCard } from "@/components/dashboard/NextMoveCard";
import { AiBriefingCard } from "@/components/dashboard/AiBriefingCard";
import { SmartLifeTriageCard } from "@/components/dashboard/SmartLifeTriageCard";
import { ActiveProjectsCard } from "@/components/dashboard/ActiveProjectsCard";
import { ItemDetailDrawer } from "@/components/dashboard/ItemDetailDrawer";
import { UnifiedItem } from "@/lib/types";
import { format, isSameDay, parseISO, isBefore, startOfDay } from "date-fns";

import { isActionableTaskOrAssignment, isExamItem } from "@/lib/nlp/itemClassifier";

export default function CommandCenterDashboard() {
  const {
    items,
    projects,
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

  // Compute next recommended task
  const nextMove = useMemo(() => {
    return recommendNextTask(items, "default", new Date());
  }, [items, recommendTick]);

  // All actionable tasks and academic assignments identified by NLP (excluding calendar class lectures)
  const actionableTasks = useMemo(() => {
    return items.filter(isActionableTaskOrAssignment);
  }, [items]);

  // Today items: strictly filter actionable tasks/assignments actually scheduled or due today (or overdue)
  const todayItems = useMemo(() => {
    const today = new Date();
    const startOfToday = startOfDay(today);

    return actionableTasks.filter((item) => {
      if (item.status === "completed") return false;

      // 1. In-progress tasks
      if (item.status === "in_progress") return true;

      // 2. Regular tasks due today or overdue
      if (item.dueAt) {
        try {
          const d = parseISO(item.dueAt);
          if (isSameDay(d, today) || isBefore(d, startOfToday)) {
            return true;
          }
        } catch {}
      }

      // 3. Regular tasks/events starting today
      if (item.startAt) {
        try {
          if (isSameDay(parseISO(item.startAt), today)) return true;
        } catch {}
      }

      return false;
    });
  }, [actionableTasks]);

  const handleOpenItem = (item: UnifiedItem) => {
    setSelectedItem(item);
    setDrawerOpen(true);
  };

  const pendingCount = actionableTasks.filter((i) => i.status !== "completed").length;
  // Strictly count deadlines that fall on today or are overdue (NOT future exams!)
  const deadlineCount = actionableTasks.filter((i) => {
    if (i.status === "completed") return false;
    if (i.dueAt) {
      try {
        const d = parseISO(i.dueAt);
        return isSameDay(d, new Date()) || isBefore(d, startOfDay(new Date()));
      } catch {}
    }
    return false;
  }).length;

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

      {/* Main Dashboard 2-Column Grid */}
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

          {/* Upcoming Exams & Assignment Dues Tabs */}
          <UpcomingExamsAndAssignments
            items={items}
            onToggleStatus={toggleItemCompletion}
            onSelectItem={handleOpenItem}
          />
        </div>

        {/* Right Secondary Column (5 cols): AI Daily Brief + Autonomous Life Triage + Active Projects */}
        <div className="lg:col-span-5 space-y-8">
          {/* AI Daily Brief */}
          <AiBriefingCard
            todayItems={todayItems}
            allItems={items}
            onSelectItem={handleOpenItem}
          />

          {/* Autonomous Life Triage: Personal, Classes, Assignments, Exams, Projects */}
          <SmartLifeTriageCard
            items={items}
            onToggleStatus={toggleItemCompletion}
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
