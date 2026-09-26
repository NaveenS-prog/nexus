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
    return format(new Date(), "EEEE · MMMM d, yyyy");
  }, []);

  // Compute next recommended task
  const nextMove = useMemo(() => {
    return recommendNextTask(items, "default", new Date());
  }, [items, recommendTick]);

  // All actionable tasks and assignments
  const actionableTasks = useMemo(() => {
    return items.filter(isActionableTaskOrAssignment);
  }, [items]);

  // Today items: tasks actually scheduled or due today
  const todayItems = useMemo(() => {
    const today = new Date();
    const startOfToday = startOfDay(today);

    return actionableTasks.filter((item) => {
      if (item.status === "completed") return false;
      if (item.status === "in_progress") return true;

      if (item.dueAt) {
        try {
          const d = parseISO(item.dueAt);
          if (isSameDay(d, today) || isBefore(d, startOfToday)) {
            return true;
          }
        } catch {}
      }

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
  const deadlineCount = actionableTasks.filter((i) => {
    if (i.status === "completed") return false;
    const isEventOrExam = i.category === "calendar" || i.category === "academic" || i.source === "google_calendar" || isExamItem(i);
    const target = isEventOrExam ? (i.startAt || i.dueAt) : (i.dueAt || i.startAt);
    if (target) {
      try {
        const d = parseISO(target);
        return isSameDay(d, new Date()) || isBefore(d, startOfDay(new Date()));
      } catch {}
    }
    return false;
  }).length;

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-10 animate-fade-in font-sans">
      {/* 1. Quiet Editorial Header */}
      <div className="border-b border-hairline pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="text-xs font-mono text-ink-muted">
            {currentDateString}
          </div>
          <h1 className="font-editorial text-3xl sm:text-4xl font-normal text-ink tracking-tight mt-1">
            {greeting}
          </h1>
          <p className="text-xs text-ink-secondary mt-1">
            {pendingCount} active task{pendingCount !== 1 ? "s" : ""} · {deadlineCount} requiring attention today
          </p>
        </div>

        <div className="text-left sm:text-right">
          <div className="text-[11px] font-mono text-ink-muted">NEXUS Command</div>
          <div className="text-[10px] font-mono text-ink-faint mt-0.5">Focus Mode Ready</div>
        </div>
      </div>

      {/* 2. Today's Focus / What Should I Do Now? */}
      <section aria-label="Today's Primary Focus">
        <NextMoveCard
          recommendation={nextMove}
          onRefresh={() => setRecommendTick((t) => t + 1)}
          onSelectTask={handleOpenItem}
        />
      </section>

      {/* 3. Main Editorial Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left Primary Column (7 cols): Your Day + Coming Up */}
        <div className="lg:col-span-7 space-y-10">
          <TodayFocusTimeline
            items={todayItems}
            onToggleStatus={toggleItemCompletion}
            onSelectItem={handleOpenItem}
          />

          <UpcomingExamsAndAssignments
            items={items}
            onToggleStatus={toggleItemCompletion}
            onSelectItem={handleOpenItem}
          />
        </div>

        {/* Right Column (5 cols): Work in Progress + Intelligence + Domain Triage */}
        <div className="lg:col-span-5 space-y-10">
          <ActiveProjectsCard projects={projects} />

          <AiBriefingCard
            todayItems={todayItems}
            allItems={items}
            onSelectItem={handleOpenItem}
          />

          <SmartLifeTriageCard
            items={items}
            onToggleStatus={toggleItemCompletion}
            onSelectItem={handleOpenItem}
          />
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
