"use client";

import { useState, useMemo } from "react";
import { 
  GraduationCap, 
  BookOpen, 
  Calendar, 
  CheckCircle2, 
  Circle,
  ExternalLink, 
  Clock, 
  FileCheck
} from "lucide-react";
import { useNexusStore } from "@/lib/data/store";
import { ItemDetailDrawer } from "@/components/dashboard/ItemDetailDrawer";
import { UnifiedItem } from "@/lib/types";
import { 
  isExamItem, 
  smartTriageItem, 
  inferCourseFromItem, 
  getExamTypeLabel 
} from "@/lib/nlp/itemClassifier";
import { 
  format, 
  parseISO, 
  differenceInCalendarDays, 
  startOfDay, 
  isToday, 
  isTomorrow 
} from "date-fns";
import { cn } from "@/components/ui/badge";

export default function AcademicsPage() {
  const { items, toggleItemCompletion, deleteItem } = useNexusStore();
  const [selectedItem, setSelectedItem] = useState<UnifiedItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // 1. Separate Exams from Assignments
  const exams = useMemo(() => {
    return items
      .filter((item) => {
        if (isExamItem(item)) return true;
        const triage = smartTriageItem(item);
        return triage.domain === "exam" || item.tags?.includes("Exam");
      })
      .sort((a, b) => {
        const dateA = a.startAt || a.dueAt || "9999";
        const dateB = b.startAt || b.dueAt || "9999";
        return dateA.localeCompare(dateB);
      });
  }, [items]);

  // 2. Strict Academic Coursework
  const assignments = useMemo(() => {
    return items.filter((item) => {
      if (isExamItem(item)) return false;
      const triage = smartTriageItem(item);
      if (triage.domain === "exam") return false;
      return (
        triage.domain === "assignment" ||
        item.source === "google_classroom" ||
        (item.category === "academic" && triage.domain !== "class_lecture")
      );
    });
  }, [items]);

  // 3. Intelligent Course Extraction
  const courseMap = useMemo(() => {
    const map = new Map<string, { examsCount: number; assignmentsCount: number; items: UnifiedItem[] }>();

    [...exams, ...assignments].forEach((item) => {
      const course = inferCourseFromItem(item) || item.courseName || "General Academics";
      if (!map.has(course)) {
        map.set(course, { examsCount: 0, assignmentsCount: 0, items: [] });
      }
      const entry = map.get(course)!;
      entry.items.push(item);
      if (isExamItem(item)) {
        if (item.status !== "completed") entry.examsCount += 1;
      } else {
        if (item.status !== "completed") entry.assignmentsCount += 1;
      }
    });

    return map;
  }, [exams, assignments]);

  const courses = Array.from(courseMap.keys());
  const activeExamsCount = exams.filter((e) => e.status !== "completed").length;
  const completedAssignmentsCount = assignments.filter((a) => a.status === "completed").length;

  const getExamCountdown = (exam: UnifiedItem) => {
    const targetDate = exam.startAt || exam.dueAt;
    if (!targetDate) return { text: "Date Pending", isUrgent: false };

    try {
      const parsed = parseISO(targetDate);
      if (isToday(parsed)) {
        return { text: "EXAM TODAY", isUrgent: true };
      }
      if (isTomorrow(parsed)) {
        return { text: "Tomorrow", isUrgent: true };
      }

      const diffDays = differenceInCalendarDays(parsed, startOfDay(new Date()));
      if (diffDays < 0) {
        return { text: "Concluded", isUrgent: false };
      }
      if (diffDays <= 5) {
        return { text: `In ${diffDays} days`, isUrgent: true };
      }
      return { text: `In ${diffDays} days`, isUrgent: false };
    } catch {
      return { text: "Scheduled", isUrgent: false };
    }
  };

  const handleOpenItem = (item: UnifiedItem) => {
    setSelectedItem(item);
    setDrawerOpen(true);
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-12 animate-fade-in font-sans">
      {/* Top Header */}
      <div className="border-b border-hairline pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-editorial text-3xl sm:text-4xl font-normal text-ink tracking-tight">
            Academic Radar
          </h1>
          <p className="text-xs text-ink-secondary mt-1">
            Separated examination radar, registered courses, and coursework deliverables
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono text-ink-muted">
          <span>{activeExamsCount} upcoming exam{activeExamsCount !== 1 ? "s" : ""}</span>
          <span>·</span>
          <span>{courses.length} courses</span>
        </div>
      </div>

      {/* SECTION 1: SCHEDULED EXAMINATIONS */}
      <section className="space-y-4">
        <div className="flex items-baseline justify-between border-b border-hairline pb-2">
          <h2 className="text-xs font-mono uppercase tracking-wider text-ink-secondary font-medium">
            Examination Radar
          </h2>
          <span className="text-[11px] font-mono text-ink-muted">
            {activeExamsCount} scheduled
          </span>
        </div>

        {exams.length === 0 ? (
          <div className="p-8 rounded-md border border-hairline bg-surface text-center text-xs text-ink-muted">
            No examinations detected. Connect and sync your Google Calendar in Settings to automatically populate your exam radar.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {exams.map((exam) => {
              const countdown = getExamCountdown(exam);
              const courseTitle = inferCourseFromItem(exam) || exam.courseName || "Academic Course";
              const examType = getExamTypeLabel(exam.title);
              const isCompleted = exam.status === "completed";

              return (
                <div
                  key={exam.id}
                  onClick={() => handleOpenItem(exam)}
                  className={cn(
                    "p-5 rounded-md border border-hairline bg-surface hover:border-hairline-darker transition-all cursor-pointer flex flex-col justify-between space-y-4 shadow-subtle group",
                    isCompleted && "opacity-50"
                  )}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-ink-secondary font-medium">{courseTitle}</span>
                      <span className={cn(
                        "text-[10px]",
                        countdown.isUrgent ? "text-terracotta font-medium" : "text-olive font-medium"
                      )}>
                        {countdown.text}
                      </span>
                    </div>

                    <h3 className="text-sm font-medium text-ink group-hover:text-olive transition-colors leading-snug">
                      {exam.title}
                    </h3>

                    <div className="text-[11px] text-ink-muted font-mono space-y-0.5 pt-1">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-ink-muted" />
                        <span>
                          {exam.startAt
                            ? (exam.metadata?.isAllDay || exam.startAt.includes("T00:00:00")
                                ? format(parseISO(exam.startAt), "EEE, MMM d (All Day)")
                                : format(parseISO(exam.startAt), "EEE, MMM d · h:mm a"))
                            : "Schedule pending"}
                        </span>
                      </div>
                      {exam.metadata?.location && (
                        <div className="text-ink-secondary text-[10px]">
                          Location: {exam.metadata.location}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Preparation Status Toggle */}
                  <div className="pt-2 border-t border-hairline-subtle flex items-center justify-between text-[11px]">
                    <span className="text-ink-muted font-mono text-[10px]">
                      {isCompleted ? "Prepared" : "Requires Review"}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleItemCompletion(exam.id);
                      }}
                      className="text-xs text-ink-muted hover:text-ink transition-colors"
                    >
                      {isCompleted ? "Mark Unprepared" : "Mark Done"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* SECTION 2: ENROLLED SUBJECTS & COURSES */}
      <section className="space-y-4">
        <div className="flex items-baseline justify-between border-b border-hairline pb-2">
          <h2 className="text-xs font-mono uppercase tracking-wider text-ink-secondary font-medium">
            Enrolled Subjects
          </h2>
          <span className="text-[11px] font-mono text-ink-muted">
            {courses.length} subjects discovered
          </span>
        </div>

        {courses.length === 0 ? (
          <div className="p-6 rounded-md border border-hairline bg-surface text-center text-xs text-ink-muted">
            No enrolled courses detected. Courses are derived automatically from your calendar events and coursework.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map((courseName) => {
              const data = courseMap.get(courseName)!;
              return (
                <div
                  key={courseName}
                  className="p-4 rounded-md border border-hairline bg-surface space-y-2 shadow-subtle"
                >
                  <span className="text-[10px] font-mono text-ink-muted uppercase tracking-wider">Course</span>
                  <h3 className="text-xs font-semibold text-ink leading-snug">{courseName}</h3>
                  <div className="pt-2 border-t border-hairline-subtle flex items-center justify-between text-[11px] text-ink-muted font-mono">
                    <span>{data.examsCount} upcoming exam{data.examsCount !== 1 ? "s" : ""}</span>
                    <span>·</span>
                    <span>{data.assignmentsCount} deliverable{data.assignmentsCount !== 1 ? "s" : ""}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* SECTION 3: COURSEWORK DELIVERABLES & SUBMISSIONS */}
      <section className="space-y-4">
        <div className="flex items-baseline justify-between border-b border-hairline pb-2">
          <h2 className="text-xs font-mono uppercase tracking-wider text-ink-secondary font-medium">
            Coursework Deliverables & Submissions
          </h2>
          <span className="text-[11px] font-mono text-ink-muted">
            {completedAssignmentsCount}/{assignments.length} completed
          </span>
        </div>

        {assignments.length === 0 ? (
          <div className="p-8 text-center text-xs text-ink-muted">
            All course assignments and submissions are up to date.
          </div>
        ) : (
          <div className="divide-y divide-hairline-subtle">
            {assignments.map((item) => {
              const isCompleted = item.status === "completed";
              const courseTitle = inferCourseFromItem(item) || item.courseName || "Coursework";

              return (
                <div
                  key={item.id}
                  onClick={() => handleOpenItem(item)}
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
                        toggleItemCompletion(item.id);
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
                        <span className="text-ink-secondary">{courseTitle}</span>
                        <span>
                          Due: {item.dueAt
                            ? (item.dueAt.includes("T23:59:59") || item.metadata?.isAllDay
                                ? format(parseISO(item.dueAt), "MMM d")
                                : format(parseISO(item.dueAt), "MMM d · h:mm a"))
                            : "No fixed cutoff"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs text-ink-muted hover:text-ink transition-colors flex items-center gap-1 shrink-0 self-center"
                    >
                      <span>Classroom</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

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
