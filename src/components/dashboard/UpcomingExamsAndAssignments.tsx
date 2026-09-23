"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { 
  GraduationCap, 
  FileText, 
  Calendar as CalendarIcon, 
  Clock, 
  Play, 
  CheckCircle2, 
  Circle, 
  ChevronRight, 
  AlertCircle, 
  Layers, 
  CheckSquare,
  Sparkles,
  BookOpen
} from "lucide-react";
import { UnifiedItem } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  format, 
  parseISO, 
  differenceInCalendarDays, 
  startOfDay, 
  differenceInMinutes 
} from "date-fns";
import { isExamItem, classifyItemNLP } from "@/lib/nlp/itemClassifier";

interface UpcomingExamsAndAssignmentsProps {
  items: UnifiedItem[];
  onToggleStatus: (id: string) => void;
  onSelectItem: (item: UnifiedItem) => void;
}

type TabType = "exams" | "assignments";

export function UpcomingExamsAndAssignments({
  items,
  onToggleStatus,
  onSelectItem,
}: UpcomingExamsAndAssignmentsProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("exams");

  // 1. Filter and sort upcoming exams
  const examItems = useMemo(() => {
    return items
      .filter((item) => isExamItem(item) && item.status !== "completed")
      .sort((a, b) => {
        const timeA = a.startAt || a.dueAt || "9999";
        const timeB = b.startAt || b.dueAt || "9999";
        return timeA.localeCompare(timeB);
      });
  }, [items]);

  // 2. Filter and sort upcoming assignments & deliverables
  const assignmentItems = useMemo(() => {
    return items
      .filter((item) => {
        if (item.status === "completed") return false;
        if (isExamItem(item)) return false; // Handled in exams tab

        // Sourced from Google Classroom or tagged academic
        if (item.source === "google_classroom" || item.category === "academic") return true;

        // Semantic NLP classification
        const nlp = classifyItemNLP({
          title: item.title,
          description: item.description,
          source: item.source,
          category: item.category,
          location: item.metadata?.location,
        });

        if (nlp.type === "assignment") return true;

        // Actionable task with a defined due date (excluding calendar class lectures)
        if (item.dueAt && item.source !== "google_calendar") return true;

        return false;
      })
      .sort((a, b) => {
        const timeA = a.dueAt || a.startAt || "9999";
        const timeB = b.dueAt || b.startAt || "9999";
        return timeA.localeCompare(timeB);
      });
  }, [items]);

  const activeList = activeTab === "exams" ? examItems : assignmentItems;

  const getSourceIcon = (source: string) => {
    switch (source) {
      case "google_classroom":
        return <GraduationCap className="w-3.5 h-3.5 text-zinc-300" />;
      case "google_calendar":
        return <CalendarIcon className="w-3.5 h-3.5 text-blue-400" />;
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
      case "google_calendar": return "Google Calendar";
      case "notion": return "Notion";
      case "google_tasks": return "Google Tasks";
      default: return "NEXUS Task";
    }
  };

  const getScheduleMeta = (item: UnifiedItem) => {
    const dateStr = item.startAt || item.dueAt;
    if (!dateStr) {
      return {
        relativeBadge: "No Date",
        relativeClass: "bg-zinc-800 text-zinc-400 border-zinc-700",
        formattedSchedule: "No schedule specified",
        duration: null,
      };
    }

    try {
      const d = parseISO(dateStr);
      const today = startOfDay(new Date());
      const itemDay = startOfDay(d);
      const daysDiff = differenceInCalendarDays(itemDay, today);
      const isAllDay = Boolean(item.metadata?.isAllDay || item.tags?.includes("All Day"));

      let relativeBadge = "";
      let relativeClass = "bg-zinc-800 text-zinc-300 border-zinc-700";

      if (daysDiff < 0) {
        relativeBadge = daysDiff === -1 ? "Overdue" : `${Math.abs(daysDiff)}d Overdue`;
        relativeClass = "bg-rose-950/80 text-rose-300 border-rose-800";
      } else if (daysDiff === 0) {
        relativeBadge = "Today";
        relativeClass = "bg-amber-950/80 text-amber-300 border-amber-800";
      } else if (daysDiff === 1) {
        relativeBadge = "Tomorrow";
        relativeClass = "bg-cyan-950/80 text-cyan-300 border-cyan-800";
      } else if (daysDiff <= 7) {
        relativeBadge = `In ${daysDiff} days`;
        relativeClass = "bg-zinc-800 text-zinc-200 border-zinc-700";
      } else {
        relativeBadge = format(d, "MMM d");
        relativeClass = "bg-zinc-900 text-zinc-400 border-zinc-800";
      }

      let timeText = "";
      if (isAllDay) {
        timeText = "All Day";
      } else if (item.startAt && item.dueAt) {
        try {
          const start = parseISO(item.startAt);
          const end = parseISO(item.dueAt);
          timeText = `${format(start, "h:mm a")} – ${format(end, "h:mm a")}`;
        } catch {
          timeText = format(d, "h:mm a");
        }
      } else {
        timeText = format(d, "h:mm a");
      }

      const formattedSchedule = `${format(d, "EEE, MMM d")} • ${timeText}`;

      let duration: string | null = null;
      if (!isAllDay && item.startAt && item.dueAt) {
        try {
          const diff = differenceInMinutes(parseISO(item.dueAt), parseISO(item.startAt));
          if (diff > 0 && diff < 1440) {
            duration = `${diff}m`;
          }
        } catch {}
      } else if (!isAllDay && item.estimatedMinutes && item.estimatedMinutes > 0 && item.estimatedMinutes < 480) {
        duration = `${item.estimatedMinutes}m`;
      }

      return {
        relativeBadge,
        relativeClass,
        formattedSchedule,
        duration,
      };
    } catch {
      return {
        relativeBadge: "Scheduled",
        relativeClass: "bg-zinc-800 text-zinc-400 border-zinc-700",
        formattedSchedule: dateStr,
        duration: null,
      };
    }
  };

  return (
    <div className="space-y-3">
      {/* Header with Title and Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-white" />
          <h2 className="text-sm font-semibold tracking-tight text-zinc-100 uppercase font-mono">
            Upcoming Schedule
          </h2>
        </div>

        {/* Tab Toggle Switcher */}
        <div className="flex items-center p-0.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("exams")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-all font-medium ${
              activeTab === "exams"
                ? "bg-zinc-800 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Upcoming Exams</span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                activeTab === "exams"
                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                  : "bg-zinc-800 text-zinc-400"
              }`}
            >
              {examItems.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("assignments")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-all font-medium ${
              activeTab === "assignments"
                ? "bg-zinc-800 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Assignment Dues</span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                activeTab === "assignments"
                  ? "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                  : "bg-zinc-800 text-zinc-400"
              }`}
            >
              {assignmentItems.length}
            </span>
          </button>
        </div>
      </div>

      {/* Item List Container */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 divide-y divide-zinc-800/80 overflow-hidden shadow-sm">
        {activeList.length === 0 ? (
          <div className="p-8 text-center text-xs text-zinc-500 space-y-2">
            <div className="mx-auto w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 mb-2">
              {activeTab === "exams" ? (
                <GraduationCap className="w-4 h-4" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
            </div>
            <p className="text-zinc-300 font-medium">
              {activeTab === "exams"
                ? "No upcoming exams scheduled."
                : "No upcoming assignment deadlines."}
            </p>
            <p className="text-[11px] text-zinc-500">
              {activeTab === "exams"
                ? "Internal Assessments, midterms, and lab tests from your Google Calendar will appear here."
                : "Deliverables, homework, and coursework deadlines will appear here."}
            </p>
          </div>
        ) : (
          activeList.map((item) => {
            const isCompleted = item.status === "completed";
            const meta = getScheduleMeta(item);
            const isExam = isExamItem(item);

            return (
              <div
                key={item.id}
                onClick={() => onSelectItem(item)}
                className={`flex items-center justify-between p-3.5 hover:bg-zinc-900/80 transition-all group cursor-pointer ${
                  isCompleted ? "opacity-50 bg-black/40" : ""
                }`}
              >
                {/* Left Section: Checkbox, Title, and Metadata */}
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
                    <div className="flex items-center gap-2 truncate">
                      <p
                        className={`text-xs font-medium text-zinc-200 truncate ${
                          isCompleted ? "line-through text-zinc-500" : "group-hover:text-white"
                        }`}
                      >
                        {item.title}
                      </p>

                      {/* Relative time pill */}
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.2 rounded border font-semibold flex-shrink-0 ${meta.relativeClass}`}
                      >
                        {meta.relativeBadge}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-1 text-[10px] text-zinc-500 font-mono">
                      <span className="text-zinc-400 font-medium">
                        {meta.formattedSchedule}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        {getSourceIcon(item.source)}
                        <span>{getSourceLabel(item.source)}</span>
                      </span>

                      {item.courseName && (
                        <>
                          <span>•</span>
                          <span className="text-zinc-400 truncate max-w-[130px]">
                            {item.courseName}
                          </span>
                        </>
                      )}

                      {meta.duration && (
                        <>
                          <span>•</span>
                          <span>{meta.duration}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Section: Badges & Focus Mode Button */}
                <div className="flex items-center gap-2.5 flex-shrink-0">
                  {isExam && (
                    <Badge
                      variant="destructive"
                      className="text-[10px] px-1.5 py-0 font-bold tracking-wider uppercase bg-rose-500/20 text-rose-300 border border-rose-500/40"
                    >
                      EXAM
                    </Badge>
                  )}
                  {item.priority === "critical" && !isExam && (
                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                      Critical
                    </Badge>
                  )}
                  {item.priority === "high" && !isExam && (
                    <Badge variant="warning" className="text-[10px] px-1.5 py-0">
                      High
                    </Badge>
                  )}

                  {/* Launch Focus Mode button */}
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
