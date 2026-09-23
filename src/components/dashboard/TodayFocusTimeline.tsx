"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  GraduationCap, 
  Calendar as CalendarIcon, 
  Layers, 
  CheckSquare, 
  ExternalLink,
  ChevronRight,
  Play,
  Timer
} from "lucide-react";
import { UnifiedItem } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, parseISO } from "date-fns";

interface TodayFocusTimelineProps {
  items: UnifiedItem[];
  onToggleStatus: (id: string) => void;
  onSelectItem: (item: UnifiedItem) => void;
}

export function TodayFocusTimeline({ items, onToggleStatus, onSelectItem }: TodayFocusTimelineProps) {
  const router = useRouter();

  // Strictly exclude all calendar events / university classes from Today's Focus
  const actionableTasks = items.filter(
    (item) => item.category !== "calendar" && item.source !== "google_calendar"
  );

  // Sort tasks: pending first (critical -> high -> medium -> low), then completed
  const sortedItems = [...actionableTasks].sort((a, b) => {
    // Incomplete items come first
    if (a.status === "completed" && b.status !== "completed") return 1;
    if (a.status !== "completed" && b.status === "completed") return -1;

    // Priority weight
    const pWeight = { critical: 4, high: 3, medium: 2, low: 1 };
    const pDiff = (pWeight[b.priority] || 1) - (pWeight[a.priority] || 1);
    if (pDiff !== 0) return pDiff;

    const timeA = a.dueAt || a.startAt || "";
    const timeB = b.dueAt || b.startAt || "";
    return timeA.localeCompare(timeB);
  });

  const getSourceIcon = (source: string) => {
    switch (source) {
      case "google_classroom":
        return <GraduationCap className="w-3.5 h-3.5 text-zinc-300" />;
      case "notion":
        return <Layers className="w-3.5 h-3.5 text-zinc-300" />;
      case "google_tasks":
        return <CheckSquare className="w-3.5 h-3.5 text-zinc-300" />;
      default:
        return <CheckSquare className="w-3.5 h-3.5 text-zinc-300" />;
    }
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case "google_classroom": return "Coursework";
      case "notion": return "Notion";
      case "google_tasks": return "Google Tasks";
      default: return "NEXUS Task";
    }
  };

  const formatTimeSlot = (item: UnifiedItem) => {
    if (item.startAt) {
      try {
        return format(parseISO(item.startAt), "hh:mm a");
      } catch {
        return "--:--";
      }
    }
    if (item.dueAt) {
      try {
        return format(parseISO(item.dueAt), "hh:mm a");
      } catch {
        return "Today";
      }
    }
    return "Today";
  };

  const completedCount = actionableTasks.filter((i) => i.status === "completed").length;

  return (
    <div className="space-y-3">
      {/* Header with Title, Progress, and Launch Focus Mode button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-white" />
          <h2 className="text-sm font-semibold tracking-tight text-zinc-100 uppercase font-mono">
            Today's Focus
          </h2>
          <span className="text-xs text-zinc-500 font-mono">
            {completedCount}/{actionableTasks.length} Completed
          </span>
        </div>

        {/* Global Focus Mode Action */}
        <Button
          size="sm"
          variant="outline"
          onClick={() => router.push("/focus")}
          className="h-8 text-xs border-zinc-800 bg-zinc-950 text-zinc-200 hover:text-white hover:border-zinc-700 flex items-center gap-1.5"
          title="Launch Focus Mode Session"
        >
          <Timer className="w-3.5 h-3.5 text-white" />
          <span>Launch Focus</span>
        </Button>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-950 divide-y divide-zinc-800/80 overflow-hidden">
        {sortedItems.length === 0 ? (
          <div className="p-8 text-center text-xs text-zinc-500 space-y-2">
            <p>No actionable focus tasks for today. Calendar classes are tracked on the Calendar page.</p>
            <p className="text-[11px] text-zinc-600">Use the Command Palette (Ctrl+K) or Capture to add tasks.</p>
          </div>
        ) : (
          sortedItems.map((item) => {
            const isCompleted = item.status === "completed";
            const timeLabel = formatTimeSlot(item);

            return (
              <div
                key={item.id}
                className={`flex items-center justify-between p-3.5 hover:bg-zinc-900/80 transition-all group cursor-pointer ${
                  isCompleted ? "opacity-50 bg-black/40" : ""
                }`}
                onClick={() => onSelectItem(item)}
              >
                {/* Left Section: Checkbox, Title, Metadata */}
                <div className="flex items-center gap-3.5 min-w-0 pr-4">
                  {/* Completion Toggle Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleStatus(item.id);
                    }}
                    title={isCompleted ? "Mark task as incomplete" : "Mark task as complete"}
                    className="flex-shrink-0 transition-transform active:scale-90 p-0.5 cursor-pointer text-zinc-400 hover:text-white"
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 fill-emerald-950/40" />
                    ) : (
                      <Circle className="w-5 h-5 text-zinc-500 hover:text-white transition-colors" />
                    )}
                  </button>

                  {/* Title and metadata */}
                  <div className="min-w-0 truncate">
                    <p className={`text-xs font-medium text-zinc-200 truncate ${isCompleted ? "line-through text-zinc-500" : "group-hover:text-white"}`}>
                      {item.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-zinc-500 font-mono">
                      <span className="text-zinc-400 font-semibold">
                        {timeLabel}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        {getSourceIcon(item.source)}
                        <span>{getSourceLabel(item.source)}</span>
                      </span>

                      {item.courseName && (
                        <>
                          <span>•</span>
                          <span className="text-zinc-400 truncate max-w-[120px]">{item.courseName}</span>
                        </>
                      )}

                      {item.estimatedMinutes && (
                        <>
                          <span>•</span>
                          <span>{item.estimatedMinutes}m</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Section: Badges & Launch Focus Button */}
                <div className="flex items-center gap-2.5 flex-shrink-0">
                  {item.priority === "critical" && (
                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Critical</Badge>
                  )}
                  {item.priority === "high" && (
                    <Badge variant="warning" className="text-[10px] px-1.5 py-0">High</Badge>
                  )}
                  {item.status === "in_progress" && (
                    <Badge variant="cyan" className="text-[10px] px-1.5 py-0">In Progress</Badge>
                  )}

                  {/* Launch Focus Mode on this specific task */}
                  {!isCompleted && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/focus?taskId=${item.id}`);
                      }}
                      className="px-2.5 py-1 rounded-md bg-white text-black hover:bg-zinc-200 transition-all flex items-center gap-1.5 text-xs font-semibold shadow-sm cursor-pointer group/focus"
                      title={`Launch Focus session for "${item.title}"`}
                    >
                      <Play className="w-3 h-3 fill-current group-hover/focus:scale-110 transition-transform" />
                      <span className="hidden sm:inline text-[11px]">Focus</span>
                    </button>
                  )}

                  <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
