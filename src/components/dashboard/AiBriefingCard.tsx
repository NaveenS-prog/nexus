"use client";

import { useMemo } from "react";
import { Sparkles } from "lucide-react";
import { UnifiedItem } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { isExamItem } from "@/lib/nlp/itemClassifier";
import { format, parseISO, isSameDay, isBefore, startOfDay, differenceInCalendarDays } from "date-fns";

interface AiBriefingCardProps {
  todayItems?: UnifiedItem[];
  items?: UnifiedItem[]; // for backwards compatibility
  allItems?: UnifiedItem[];
  heaviestDayName?: string;
  onSelectItem?: (item: UnifiedItem) => void;
}

export function AiBriefingCard({ 
  todayItems, 
  items, 
  allItems = [], 
  heaviestDayName = "Thursday", 
  onSelectItem 
}: AiBriefingCardProps) {
  const today = new Date();
  const startOfToday = startOfDay(today);

  // Active items for today: prioritize todayItems prop, fallback to items if legacy
  const activeTodayItems = useMemo(() => {
    const raw = todayItems || items || [];
    return raw.filter((i) => {
      if (i.status === "completed") return false;
      if (i.category === "calendar" && !isExamItem(i)) return false;

      // In progress
      if (i.status === "in_progress") return true;

      // Due today or overdue
      if (i.dueAt) {
        try {
          const d = parseISO(i.dueAt);
          if (isSameDay(d, today) || isBefore(d, startOfToday)) return true;
        } catch {}
      }

      // Starting today
      if (i.startAt) {
        try {
          if (isSameDay(parseISO(i.startAt), today)) return true;
        } catch {}
      }

      // If item was created without date, treat as today task queue
      if (!i.dueAt && !i.startAt) return true;

      return false;
    });
  }, [todayItems, items, today, startOfToday]);

  // Deadlines requiring attention today (strictly due today or overdue)
  const todayDeadlines = useMemo(() => {
    return activeTodayItems.filter((i) => {
      if (i.dueAt) {
        try {
          const d = parseISO(i.dueAt);
          return isSameDay(d, today) || isBefore(d, startOfToday);
        } catch {}
      }
      return false;
    });
  }, [activeTodayItems, today, startOfToday]);

  // Upcoming exams from all items (in next 14 days, sorted chronologically)
  const upcomingExams = useMemo(() => {
    const pool = allItems.length > 0 ? allItems : (items || []);
    return pool
      .filter((i) => isExamItem(i) && i.status !== "completed")
      .sort((a, b) => {
        const timeA = a.startAt || a.dueAt || "9999";
        const timeB = b.startAt || b.dueAt || "9999";
        return timeA.localeCompare(timeB);
      });
  }, [allItems, items]);

  const nearestExam = upcomingExams[0];

  // Total minutes for today's active tasks
  const totalMinutes = activeTodayItems.reduce((sum, i) => sum + (i.estimatedMinutes || 30), 0);

  // Recommended order of attack:
  // 1. In-progress tasks
  // 2. Deadlines due today or overdue
  // 3. Other tasks today
  // 4. If space permits (< 4 tasks), suggest prep for upcoming exam with explicit upcoming date!
  const recommendedList = useMemo(() => {
    const list: Array<{ item: UnifiedItem; badgeLabel: string; isUpcoming: boolean }> = [];

    // Prioritize today's tasks
    const sortedToday = [...activeTodayItems].sort((a, b) => {
      const pWeight = { critical: 4, high: 3, medium: 2, low: 1 };
      return (pWeight[b.priority] || 1) - (pWeight[a.priority] || 1);
    });

    sortedToday.forEach((item) => {
      list.push({
        item,
        badgeLabel: item.status === "in_progress" ? "In Progress" : "Today",
        isUpcoming: false,
      });
    });

    // If fewer than 4 items, include upcoming exam prep with explicit calendar dates
    if (list.length < 4) {
      for (const exam of upcomingExams) {
        if (list.length >= 4) break;
        if (!list.some((l) => l.item.id === exam.id)) {
          const examDateStr = exam.startAt || exam.dueAt;
          let datePill = "Upcoming";
          if (examDateStr) {
            try {
              datePill = format(parseISO(examDateStr), "MMM d");
            } catch {}
          }

          list.push({
            item: exam,
            badgeLabel: `Exam (${datePill})`,
            isUpcoming: true,
          });
        }
      }
    }

    return list.slice(0, 4);
  }, [activeTodayItems, upcomingExams]);

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
          {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m today
        </Badge>
      </div>

      {/* Synthesis Bullets */}
      <div className="space-y-1.5 text-xs text-zinc-300">
        <p className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-white" />
          <span>
            {activeTodayItems.length > 0 ? (
              <>You have <strong className="text-white font-mono">{activeTodayItems.length} task{activeTodayItems.length !== 1 ? "s" : ""}</strong> scheduled today.</>
            ) : (
              <>No tasks scheduled today. <span className="text-emerald-400 font-medium">Daily agenda is clear.</span></>
            )}
          </span>
        </p>

        <p className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${todayDeadlines.length > 0 ? "bg-rose-400" : "bg-zinc-500"}`} />
          <span>
            {todayDeadlines.length > 0 ? (
              <><strong className="text-white font-mono">{todayDeadlines.length} deadline{todayDeadlines.length !== 1 ? "s" : ""}</strong> require immediate attention today.</>
            ) : (
              <><strong className="text-zinc-200 font-mono">0 deadlines</strong> due today.</>
            )}
          </span>
        </p>

        {nearestExam && (
          <p className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span>
              Upcoming Exam: <strong className="text-white font-mono">{nearestExam.title}</strong> on{" "}
              <strong className="text-amber-300 font-mono">
                {(() => {
                  const dStr = nearestExam.startAt || nearestExam.dueAt;
                  if (!dStr) return "Upcoming";
                  try {
                    const parsed = parseISO(dStr);
                    const days = differenceInCalendarDays(startOfDay(parsed), startOfToday);
                    const dateFormatted = format(parsed, "EEE, MMM d");
                    return `${dateFormatted} (in ${days}d)`;
                  } catch {
                    return dStr;
                  }
                })()}
              </strong>.
            </span>
          </p>
        )}

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

        {recommendedList.length === 0 ? (
          <div className="p-3 text-center text-xs text-zinc-500">
            No pending tasks. You are all caught up!
          </div>
        ) : (
          <div className="space-y-1.5">
            {recommendedList.map(({ item, badgeLabel, isUpcoming }, idx) => (
              <div
                key={item.id}
                onClick={() => onSelectItem && onSelectItem(item)}
                className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-between text-xs hover:border-white cursor-pointer transition-colors group"
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <span className="w-5 h-5 rounded-full bg-white text-black flex items-center justify-center font-mono text-[10px] font-bold flex-shrink-0">
                    {idx + 1}
                  </span>
                  <span className="text-zinc-200 truncate group-hover:text-white font-medium">
                    {item.title}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 text-[10px] text-zinc-500 font-mono">
                  <span className={`px-1.5 py-0.5 rounded border text-[9px] font-semibold ${
                    isUpcoming
                      ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                      : "bg-zinc-800 text-zinc-300 border-zinc-700"
                  }`}>
                    {badgeLabel}
                  </span>
                  <span>•</span>
                  <span>{item.estimatedMinutes || 45}m</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
