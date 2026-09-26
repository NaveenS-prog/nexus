"use client";

import { useState } from "react";
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  ChevronRight
} from "lucide-react";
import { UnifiedItem } from "@/lib/types";
import { format, parseISO, isSameDay, isTomorrow } from "date-fns";
import { isActionableTaskOrAssignment, isExamItem } from "@/lib/nlp/itemClassifier";
import { cn } from "@/components/ui/badge";

interface TodayFocusTimelineProps {
  items: UnifiedItem[];
  onToggleStatus: (id: string) => void;
  onSelectItem: (item: UnifiedItem) => void;
}

export function TodayFocusTimeline({ items, onToggleStatus, onSelectItem }: TodayFocusTimelineProps) {
  const actionableTasks = items.filter(isActionableTaskOrAssignment);

  const sortedItems = [...actionableTasks].sort((a, b) => {
    if (a.status === "completed" && b.status !== "completed") return 1;
    if (a.status !== "completed" && b.status === "completed") return -1;
    const pWeight = { critical: 4, high: 3, medium: 2, low: 1 };
    const pDiff = (pWeight[b.priority] || 1) - (pWeight[a.priority] || 1);
    if (pDiff !== 0) return pDiff;
    const isEventA = a.category === "calendar" || a.category === "academic" || a.source === "google_calendar" || isExamItem(a);
    const isEventB = b.category === "calendar" || b.category === "academic" || b.source === "google_calendar" || isExamItem(b);
    const timeA = (isEventA ? (a.startAt || a.dueAt) : (a.dueAt || a.startAt)) || "";
    const timeB = (isEventB ? (b.startAt || b.dueAt) : (b.dueAt || b.startAt)) || "";
    return timeA.localeCompare(timeB);
  });

  const formatDue = (item: UnifiedItem) => {
    const isAllDay = Boolean(item.metadata?.isAllDay || item.tags?.includes("All Day"));
    const isEventOrExam = item.category === "calendar" || item.category === "academic" || item.source === "google_calendar" || isExamItem(item);
    const dateStr = isEventOrExam ? (item.startAt || item.dueAt) : (item.dueAt || item.startAt);
    if (!dateStr) return undefined;
    try {
      const d = parseISO(dateStr);
      const today = new Date();
      if (isSameDay(d, today)) {
        return isAllDay ? "Today" : `Today at ${format(d, "h:mm a")}`;
      }
      if (isTomorrow(d)) {
        return isAllDay ? "Tomorrow" : `Tomorrow at ${format(d, "h:mm a")}`;
      }
      return format(d, "MMM d");
    } catch {
      return undefined;
    }
  };

  return (
    <div className="space-y-3 font-sans">
      {/* Section Header */}
      <div className="flex items-baseline justify-between border-b border-hairline pb-2">
        <h3 className="text-xs font-mono uppercase tracking-wider text-ink-secondary font-medium">
          Your Day · Commitments
        </h3>
        <span className="text-[11px] text-ink-muted font-mono">
          {actionableTasks.filter((i) => i.status !== "completed").length} active
        </span>
      </div>

      {/* Task List */}
      {sortedItems.length === 0 ? (
        <div className="py-8 text-center text-xs text-ink-muted font-sans">
          Your day is clear. No commitments or tasks scheduled for today.
        </div>
      ) : (
        <div className="divide-y divide-hairline-subtle">
          {sortedItems.map((item) => {
            const isCompleted = item.status === "completed";
            const dueLabel = formatDue(item);

            return (
              <div
                key={item.id}
                onClick={() => onSelectItem(item)}
                className={cn(
                  "py-3 flex items-start justify-between gap-3 group cursor-pointer transition-colors hover:bg-canvas-secondary/40 px-2 rounded-sm -mx-2",
                  isCompleted && "opacity-50"
                )}
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleStatus(item.id);
                    }}
                    className="mt-0.5 text-ink-muted hover:text-olive transition-colors shrink-0"
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4 text-olive" />
                    ) : (
                      <Circle className="w-4 h-4 text-hairline-darker hover:text-olive" />
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    <span className={cn(
                      "text-xs font-medium text-ink transition-colors block leading-snug",
                      isCompleted && "line-through text-ink-muted"
                    )}>
                      {item.title}
                    </span>

                    <div className="flex items-center gap-2 mt-1 text-[11px] text-ink-muted font-mono">
                      {dueLabel && (
                        <span className={item.priority === "critical" && !isCompleted ? "text-terracotta font-medium" : ""}>
                          {dueLabel}
                        </span>
                      )}
                      {dueLabel && item.estimatedMinutes && <span>·</span>}
                      {item.estimatedMinutes && <span>{item.estimatedMinutes}m</span>}
                      {item.courseName && <span>·</span>}
                      {item.courseName && <span className="text-ink-secondary">{item.courseName}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center text-ink-faint group-hover:text-ink-muted transition-colors shrink-0 self-center">
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
