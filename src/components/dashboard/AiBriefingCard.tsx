"use client";

import { useMemo } from "react";
import { UnifiedItem } from "@/lib/types";
import { isExamItem } from "@/lib/nlp/itemClassifier";
import { format, parseISO, isSameDay, isBefore, startOfDay, addDays } from "date-fns";

export interface PeakDay {
  dayName: string;
  dateStr: string;
  minutes: number;
  count: number;
  examTitles: string[];
}

interface AiBriefingCardProps {
  todayItems?: UnifiedItem[];
  items?: UnifiedItem[];
  allItems?: UnifiedItem[];
  heaviestDayName?: string;
  onSelectItem?: (item: UnifiedItem) => void;
}

export function AiBriefingCard({ 
  todayItems, 
  items, 
  allItems = [], 
  onSelectItem 
}: AiBriefingCardProps) {
  const today = new Date();
  const startOfToday = startOfDay(today);

  const activeTodayItems = useMemo(() => {
    const raw = todayItems || items || [];
    return raw.filter((i) => {
      if (i.status === "completed") return false;
      if (i.category === "calendar" && !isExamItem(i)) return false;
      if (i.status === "in_progress") return true;
      if (i.dueAt) {
        try {
          const d = parseISO(i.dueAt);
          if (isSameDay(d, today) || isBefore(d, startOfToday)) return true;
        } catch {}
      }
      if (i.startAt) {
        try {
          if (isSameDay(parseISO(i.startAt), today)) return true;
        } catch {}
      }
      if (!i.dueAt && !i.startAt) return true;
      return false;
    });
  }, [todayItems, items, today, startOfToday]);

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

  const peakWorkload = useMemo<PeakDay | null>(() => {
    const dayMap = new Map<string, { dayName: string; dateStr: string; minutes: number; count: number; examTitles: string[] }>();

    for (let i = 1; i <= 14; i++) {
      const d = addDays(today, i);
      const dateKey = format(d, "yyyy-MM-dd");
      dayMap.set(dateKey, {
        dayName: format(d, "EEEE"),
        dateStr: format(d, "MMM d"),
        minutes: 0,
        count: 0,
        examTitles: [],
      });
    }

    const pool = allItems.length > 0 ? allItems : (items || []);
    pool.forEach((item) => {
      if (item.status === "completed") return;
      const targetStr = item.startAt || item.dueAt;
      if (!targetStr) return;
      const dateKey = targetStr.slice(0, 10);
      if (dayMap.has(dateKey)) {
        const entry = dayMap.get(dateKey)!;
        entry.count += 1;
        entry.minutes += item.estimatedMinutes || 60;
        if (isExamItem(item)) {
          entry.examTitles.push(item.title);
          entry.minutes += 60;
        }
      }
    });

    let maxDay: PeakDay | null = null;
    dayMap.forEach((val) => {
      if (val.count > 0) {
        if (!maxDay || val.minutes > maxDay.minutes) {
          maxDay = val;
        }
      }
    });

    return maxDay;
  }, [allItems, items, today]);

  const totalMinutes = activeTodayItems.reduce((sum, i) => sum + (i.estimatedMinutes || 30), 0);

  return (
    <div className="space-y-3 font-sans">
      <div className="flex items-baseline justify-between border-b border-hairline pb-2">
        <h3 className="text-xs font-mono uppercase tracking-wider text-ink-secondary font-medium">
          Daily Intelligence
        </h3>
        <span className="text-[11px] text-ink-muted font-mono">
          ~{Math.round(totalMinutes / 60 * 10) / 10}h scheduled
        </span>
      </div>

      <div className="rounded-md border border-hairline bg-surface p-4 space-y-3 shadow-subtle">
        {/* Workload Collision Forecast */}
        {peakWorkload ? (
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-ink-muted">
              Workload Collision
            </span>
            <p className="text-xs text-ink leading-relaxed mt-1">
              Your heaviest upcoming workload collides on <strong className="font-semibold text-ink">{peakWorkload.dayName}, {peakWorkload.dateStr}</strong> with {peakWorkload.count} commitment{peakWorkload.count !== 1 ? "s" : ""}.
              {peakWorkload.examTitles.length > 0 && ` (${peakWorkload.examTitles.join(", ")})`}
            </p>
          </div>
        ) : (
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-ink-muted">
              Pacing
            </span>
            <p className="text-xs text-ink-secondary leading-relaxed mt-1">
              Schedule is balanced across the next two weeks with no major congestion detected.
            </p>
          </div>
        )}

        {/* Nearest Exam Countdown */}
        {upcomingExams.length > 0 && (
          <div className="pt-2.5 border-t border-hairline-subtle flex items-center justify-between text-xs">
            <span className="text-ink-muted font-mono text-[11px]">Nearest Assessment</span>
            <span className="font-medium text-olive font-mono text-[11px]">
              {upcomingExams[0].title} · {upcomingExams[0].startAt ? format(parseISO(upcomingExams[0].startAt), "MMM d") : "Upcoming"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
