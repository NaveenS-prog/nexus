"use client";

import { useState } from "react";
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  GraduationCap, 
  Calendar as CalendarIcon, 
  Layers, 
  CheckSquare, 
  ChevronRight
} from "lucide-react";
import { UnifiedItem } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";

interface TodayFocusTimelineProps {
  items: UnifiedItem[];
  onToggleStatus: (id: string) => void;
  onSelectItem: (item: UnifiedItem) => void;
}

export function TodayFocusTimeline({ items, onToggleStatus, onSelectItem }: TodayFocusTimelineProps) {
  const sortedItems = [...items].sort((a, b) => {
    const timeA = a.startAt || a.dueAt || "";
    const timeB = b.startAt || b.dueAt || "";
    return timeA.localeCompare(timeB);
  });

  const getSourceIcon = (source: string) => {
    switch (source) {
      case "google_classroom":
        return <GraduationCap className="w-3.5 h-3.5 text-zinc-500" />;
      case "google_calendar":
        return <CalendarIcon className="w-3.5 h-3.5 text-zinc-500" />;
      case "notion":
        return <Layers className="w-3.5 h-3.5 text-zinc-500" />;
      case "google_tasks":
        return <CheckSquare className="w-3.5 h-3.5 text-zinc-500" />;
      default:
        return <CheckSquare className="w-3.5 h-3.5 text-zinc-500" />;
    }
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case "google_classroom": return "Google Classroom";
      case "google_calendar": return "Google Calendar";
      case "notion": return "Notion";
      case "google_tasks": return "Google Tasks";
      default: return "NEXUS";
    }
  };

  const formatTimeSlot = (item: UnifiedItem) => {
    if (item.startAt) {
      try {
        return format(parseISO(item.startAt), "HH:mm");
      } catch {
        return "--:--";
      }
    }
    if (item.dueAt) {
      try {
        return format(parseISO(item.dueAt), "HH:mm");
      } catch {
        return "EOD";
      }
    }
    return "--:--";
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-zinc-950" />
          <h2 className="text-sm font-semibold tracking-tight text-zinc-950 uppercase font-mono">
            Today's Focus
          </h2>
        </div>
        <span className="text-xs text-zinc-500 font-mono">
          {items.filter((i) => i.status === "completed").length}/{items.length} Completed
        </span>
      </div>

      <div className="rounded-xl border border-zinc-200/90 bg-white/90 backdrop-blur-md divide-y divide-zinc-100 overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.03),0_8px_24px_rgba(0,0,0,0.02)]">
        {sortedItems.length === 0 ? (
          <div className="p-8 text-center text-xs text-zinc-400">
            No focus items scheduled for today. Take a breather or dump new tasks!
          </div>
        ) : (
          sortedItems.map((item) => {
            const isCompleted = item.status === "completed";
            const isCalendarEvent = item.category === "calendar";
            const timeLabel = formatTimeSlot(item);

            return (
              <div
                key={item.id}
                className={`flex items-center justify-between p-3.5 hover:bg-zinc-50/90 transition-all group cursor-pointer ${
                  isCompleted ? "opacity-60 bg-zinc-50/40" : ""
                }`}
                onClick={() => onSelectItem(item)}
              >
                {/* Left Section: Time, Checkbox, Title */}
                <div className="flex items-center gap-3.5 min-w-0 pr-4">
                  {/* Time Badge */}
                  <span className="font-mono text-xs font-semibold text-zinc-500 w-12 flex-shrink-0">
                    {timeLabel}
                  </span>

                  {/* Completion Toggle */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isCalendarEvent) {
                        onToggleStatus(item.id);
                      }
                    }}
                    disabled={isCalendarEvent}
                    title={isCalendarEvent ? "Calendar events cannot be completed" : "Toggle completion"}
                    className={`flex-shrink-0 transition-transform active:scale-90 ${
                      isCalendarEvent ? "cursor-default text-zinc-400" : "cursor-pointer"
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4 text-zinc-950" />
                    ) : (
                      <Circle className={`w-4 h-4 ${isCalendarEvent ? "text-zinc-300" : "text-zinc-400 group-hover:text-zinc-950"}`} />
                    )}
                  </button>

                  {/* Title and metadata */}
                  <div className="min-w-0 truncate">
                    <p className={`text-xs font-medium text-zinc-800 truncate ${isCompleted ? "line-through text-zinc-400" : "group-hover:text-zinc-950 font-semibold"}`}>
                      {item.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-zinc-500">
                      <span className="flex items-center gap-1 font-mono">
                        {getSourceIcon(item.source)}
                        <span>{getSourceLabel(item.source)}</span>
                      </span>

                      {item.courseName && (
                        <>
                          <span>•</span>
                          <span className="text-zinc-600">{item.courseName}</span>
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

                {/* Right Section: Badges & Arrow */}
                <div className="flex items-center gap-2.5 flex-shrink-0">
                  {item.priority === "critical" && (
                    <Badge variant="destructive">Critical</Badge>
                  )}
                  {item.priority === "high" && (
                    <Badge variant="warning">High</Badge>
                  )}
                  {item.status === "in_progress" && (
                    <Badge variant="cyan">In Progress</Badge>
                  )}

                  <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-zinc-600 transition-colors" />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
