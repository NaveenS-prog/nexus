"use client";

import { useState, useMemo } from "react";
import { 
  GraduationCap, 
  Calendar as CalendarIcon, 
  ChevronRight,
  ExternalLink
} from "lucide-react";
import { UnifiedItem } from "@/lib/types";
import { format, parseISO, differenceInCalendarDays, startOfDay } from "date-fns";
import { isExamItem, inferCourseFromItem } from "@/lib/nlp/itemClassifier";
import { cn } from "@/components/ui/badge";

interface UpcomingExamsAndAssignmentsProps {
  items: UnifiedItem[];
  onToggleStatus: (id: string) => void;
  onSelectItem: (item: UnifiedItem) => void;
}

export function UpcomingExamsAndAssignments({
  items,
  onToggleStatus,
  onSelectItem,
}: UpcomingExamsAndAssignmentsProps) {
  const [activeTab, setActiveTab] = useState<"exams" | "assignments">("exams");

  // Filter exams
  const examItems = useMemo(() => {
    return items
      .filter((item) => isExamItem(item) && item.status !== "completed")
      .sort((a, b) => {
        const timeA = a.startAt || a.dueAt || "9999";
        const timeB = b.startAt || b.dueAt || "9999";
        return timeA.localeCompare(timeB);
      });
  }, [items]);

  // Filter coursework deliverables
  const assignmentItems = useMemo(() => {
    return items
      .filter((item) => {
        if (item.status === "completed") return false;
        if (isExamItem(item)) return false;
        return (
          item.source === "google_classroom" ||
          item.category === "academic" ||
          (item.dueAt && item.source !== "google_calendar")
        );
      })
      .sort((a, b) => {
        const timeA = a.dueAt || a.startAt || "9999";
        const timeB = b.dueAt || b.startAt || "9999";
        return timeA.localeCompare(timeB);
      });
  }, [items]);

  const activeList = activeTab === "exams" ? examItems : assignmentItems;

  const getCountdownLabel = (dateStr?: string) => {
    if (!dateStr) return undefined;
    try {
      const target = parseISO(dateStr);
      const today = startOfDay(new Date());
      const diff = differenceInCalendarDays(target, today);
      if (diff === 0) return "Today";
      if (diff === 1) return "Tomorrow";
      if (diff > 1 && diff <= 7) return `In ${diff} days`;
      return format(target, "MMM d");
    } catch {
      return undefined;
    }
  };

  return (
    <div className="space-y-3 font-sans">
      {/* Header & Tabs */}
      <div className="flex items-center justify-between border-b border-hairline pb-2">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setActiveTab("exams")}
            className={cn(
              "text-xs font-mono uppercase tracking-wider transition-colors pb-0.5",
              activeTab === "exams"
                ? "text-ink font-semibold border-b-2 border-olive -mb-2"
                : "text-ink-muted hover:text-ink"
            )}
          >
            Examinations ({examItems.length})
          </button>
          <button
            onClick={() => setActiveTab("assignments")}
            className={cn(
              "text-xs font-mono uppercase tracking-wider transition-colors pb-0.5",
              activeTab === "assignments"
                ? "text-ink font-semibold border-b-2 border-olive -mb-2"
                : "text-ink-muted hover:text-ink"
            )}
          >
            Coursework ({assignmentItems.length})
          </button>
        </div>

        <span className="text-[11px] text-ink-muted font-mono">
          Coming Up
        </span>
      </div>

      {/* List Items */}
      {activeList.length === 0 ? (
        <div className="py-8 text-center text-xs text-ink-muted">
          {activeTab === "exams" 
            ? "No upcoming examinations detected in your connected Google Calendar." 
            : "No coursework deliverables pending."}
        </div>
      ) : (
        <div className="divide-y divide-hairline-subtle">
          {activeList.map((item) => {
            const countdown = getCountdownLabel(item.startAt || item.dueAt);
            const courseTitle = inferCourseFromItem(item) || item.courseName;
            const dateStr = item.startAt || item.dueAt;
            const timeFormatted = dateStr ? format(parseISO(dateStr), "EEE, MMM d · h:mm a") : undefined;

            return (
              <div
                key={item.id}
                onClick={() => onSelectItem(item)}
                className="py-3 flex items-start justify-between gap-3 group cursor-pointer transition-colors hover:bg-canvas-secondary/40 px-2 rounded-sm -mx-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-medium text-ink group-hover:text-olive transition-colors truncate">
                      {item.title}
                    </span>
                    {countdown && (
                      <span className={cn(
                        "text-[10px] font-mono shrink-0",
                        countdown === "Today" ? "text-terracotta font-semibold" : "text-olive font-medium"
                      )}>
                        {countdown}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-1 text-[11px] text-ink-muted font-mono">
                    {courseTitle && <span className="text-ink-secondary">{courseTitle}</span>}
                    {courseTitle && timeFormatted && <span>·</span>}
                    {timeFormatted && <span>{timeFormatted}</span>}
                    {item.metadata?.location && <span>·</span>}
                    {item.metadata?.location && <span>{item.metadata.location}</span>}
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
