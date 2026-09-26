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
  AlertCircle,
  Sparkles,
  Award,
  Layers,
  FileCheck,
  CalendarDays,
  ShieldAlert
} from "lucide-react";
import { useNexusStore } from "@/lib/data/store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  isBefore, 
  startOfDay, 
  isToday, 
  isTomorrow 
} from "date-fns";

export default function AcademicsPage() {
  const { items, toggleItemCompletion, deleteItem } = useNexusStore();
  const [selectedItem, setSelectedItem] = useState<UnifiedItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "exams" | "assignments">("all");

  const today = useMemo(() => new Date(), []);

  // 1. Separate Exams from Assignments using autonomous classifier
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

  // 2. Strict Academic Assignments (Coursework, Lab Reports, Problem sets)
  // EXCLUDES all exams so they are NEVER treated as assignments with due dates!
  const assignments = useMemo(() => {
    return items.filter((item) => {
      // Must NOT be an exam
      if (isExamItem(item)) return false;
      const triage = smartTriageItem(item);
      if (triage.domain === "exam") return false;

      // Must be an assignment domain, Google Classroom source, or academic category deliverable
      return (
        triage.domain === "assignment" ||
        item.source === "google_classroom" ||
        (item.category === "academic" && triage.domain !== "class_lecture")
      );
    });
  }, [items]);

  // 3. Intelligent Course Extraction & Analytics
  const courseMap = useMemo(() => {
    const map = new Map<string, { examsCount: number; assignmentsCount: number; items: UnifiedItem[] }>();

    // Process both exams and assignments to discover enrolled courses
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

  // 4. Academic Health Stats
  const activeExamsCount = exams.filter((e) => e.status !== "completed").length;
  const nextExam = exams.find((e) => e.status !== "completed");
  const completedAssignmentsCount = assignments.filter((a) => a.status === "completed").length;
  const pendingAssignmentsCount = assignments.filter((a) => a.status !== "completed").length;

  const handleOpenItem = (item: UnifiedItem) => {
    setSelectedItem(item);
    setDrawerOpen(true);
  };

  const getExamCountdown = (item: UnifiedItem) => {
    const dateStr = item.startAt || item.dueAt;
    if (!dateStr) return { label: "Date Pending", badgeClass: "bg-zinc-800 text-zinc-400 border-zinc-700" };
    try {
      const target = parseISO(dateStr);
      if (isToday(target)) {
        return { label: "EXAM TODAY", badgeClass: "bg-rose-500/20 text-rose-300 border-rose-500/60 font-bold animate-pulse" };
      }
      if (isTomorrow(target)) {
        return { label: "TOMORROW", badgeClass: "bg-amber-500/20 text-amber-300 border-amber-500/60 font-bold" };
      }
      const days = differenceInCalendarDays(target, today);
      if (days < 0) {
        return { label: "Concluded", badgeClass: "bg-zinc-800/80 text-zinc-500 border-zinc-700" };
      }
      if (days <= 5) {
        return { label: `In ${days} days (Urgent)`, badgeClass: "bg-rose-950/60 text-rose-300 border-rose-800 font-semibold" };
      }
      return { label: `In ${days} days`, badgeClass: "bg-zinc-900 text-zinc-300 border-zinc-800" };
    } catch {
      return { label: "Upcoming", badgeClass: "bg-zinc-900 text-zinc-300 border-zinc-800" };
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-8 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-white" />
            <h1 className="text-2xl font-bold tracking-tight text-white">Academics & Examination Radar</h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Autonomous assessment radar, syllabus tracking, and coursework submissions
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-zinc-400 border-zinc-800">
            Semester Schedule
          </Badge>
          <Badge variant="secondary" className="font-mono bg-white text-black font-semibold">
            {activeExamsCount} Upcoming Exams
          </Badge>
        </div>
      </div>

      {/* Academic Overview Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Next Exam Card */}
        <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950 space-y-2">
          <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 uppercase">
            <span>Next Assessment</span>
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
          </div>
          {nextExam ? (
            <div>
              <h3 className="text-sm font-bold text-white truncate">{nextExam.title}</h3>
              <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                {nextExam.startAt ? format(parseISO(nextExam.startAt), "EEE, MMM d • h:mm a") : "Scheduled"}
              </p>
            </div>
          ) : (
            <p className="text-xs text-zinc-500">No pending exams</p>
          )}
        </div>

        {/* Exams Counter Card */}
        <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950 space-y-2">
          <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 uppercase">
            <span>Scheduled Exams</span>
            <CalendarDays className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white font-mono">{activeExamsCount}</span>
            <span className="text-xs text-zinc-500">active evaluation{activeExamsCount !== 1 ? "s" : ""}</span>
          </div>
        </div>

        {/* Assignments Counter Card */}
        <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950 space-y-2">
          <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 uppercase">
            <span>Coursework Submissions</span>
            <FileCheck className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white font-mono">{pendingAssignmentsCount}</span>
            <span className="text-xs text-zinc-500">due / {assignments.length} total</span>
          </div>
        </div>

        {/* Enrolled Courses Card */}
        <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950 space-y-2">
          <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 uppercase">
            <span>Active Courses</span>
            <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white font-mono">{courses.length}</span>
            <span className="text-xs text-zinc-500">subjects tracked</span>
          </div>
        </div>
      </div>

      {/* SECTION 1: SCHEDULED EXAMINATIONS & ASSESSMENTS */}
      {/* (Exams are cleanly presented as examination slots, NEVER as homework submissions) */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <Calendar className="w-3.5 h-3.5" />
            </div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-white font-mono">
              Scheduled Examinations & Assessments
            </h2>
          </div>
          <span className="text-xs text-zinc-400 font-mono">
            {activeExamsCount} pending • Autonomous evaluation radar
          </span>
        </div>

        {exams.length === 0 ? (
          <div className="p-8 rounded-xl border border-zinc-800 bg-zinc-950 text-center text-xs text-zinc-500">
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
                  className={`p-4 rounded-xl border border-zinc-800 bg-zinc-950 hover:border-zinc-700 transition-all cursor-pointer flex flex-col justify-between space-y-4 group ${
                    isCompleted ? "opacity-60 bg-black/40" : ""
                  }`}
                >
                  <div className="space-y-2">
                    {/* Course Code & Countdown Badge */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-zinc-900 text-zinc-300 border border-zinc-800 truncate">
                        {courseTitle}
                      </span>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${countdown.badgeClass}`}>
                        {countdown.label}
                      </span>
                    </div>

                    {/* Title */}
                    <div>
                      <h3 className={`text-sm font-bold text-white group-hover:text-zinc-200 transition-colors ${
                        isCompleted ? "line-through text-zinc-500" : ""
                      }`}>
                        {exam.title}
                      </h3>
                      <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                        {examType}
                      </p>
                    </div>

                    {/* Schedule Time Information */}
                    <div className="p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800/80 space-y-1 text-xs">
                      <div className="flex items-center gap-1.5 text-zinc-300">
                        <Calendar className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span className="font-mono text-[11px]">
                          {exam.startAt ? format(parseISO(exam.startAt), "EEEE, MMMM d, yyyy") : "Date TBD"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-zinc-400">
                        <Clock className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                        <span className="font-mono text-[11px]">
                          {exam.metadata?.isAllDay || (!exam.startAt?.includes("T") || exam.startAt?.includes("T00:00:00"))
                            ? "All-Day Schedule Window"
                            : `${format(parseISO(exam.startAt), "h:mm a")} – ${exam.dueAt ? format(parseISO(exam.dueAt), "h:mm a") : "End"}`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Action Footer */}
                  <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px]">
                    <span className="text-zinc-500 font-mono text-[10px]">
                      {isCompleted ? "Exam Concluded" : "Preparation Required"}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleItemCompletion(exam.id);
                      }}
                      className="text-xs font-medium text-zinc-400 hover:text-white transition-colors"
                    >
                      {isCompleted ? "Mark Incomplete" : "Mark Prepared / Done"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 2: ACTIVE ENROLLED COURSES */}
      <div className="space-y-3">
        <h2 className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-semibold flex items-center gap-1.5">
          <BookOpen className="w-3.5 h-3.5 text-zinc-400" />
          <span>Enrolled Subjects & Courses</span>
        </h2>
        {courses.length === 0 ? (
          <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-950 text-center text-xs text-zinc-500">
            No enrolled courses detected. Courses are automatically derived from your calendar and assignments.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map((courseName) => {
              const data = courseMap.get(courseName)!;
              return (
                <div
                  key={courseName}
                  className="p-4 rounded-xl border border-zinc-800 bg-zinc-950 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-white">SUBJECT</span>
                    <span className="text-[10px] font-mono text-zinc-500">Autonomous Track</span>
                  </div>
                  <h3 className="text-sm font-bold text-zinc-100">{courseName}</h3>
                  <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400 font-mono">
                    <span>{data.examsCount} upcoming exam{data.examsCount !== 1 ? "s" : ""}</span>
                    <span>•</span>
                    <span>{data.assignmentsCount} pending submission{data.assignmentsCount !== 1 ? "s" : ""}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 3: COURSEWORK ASSIGNMENTS & DELIVERABLES */}
      {/* (Only genuine coursework/homework/lab submissions are listed here; NEVER exams) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
          <h2 className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-semibold flex items-center gap-1.5">
            <FileCheck className="w-3.5 h-3.5 text-zinc-400" />
            <span>Coursework Deliverables & Submissions</span>
          </h2>
          <span className="text-xs text-zinc-500 font-mono">
            {completedAssignmentsCount}/{assignments.length} Completed
          </span>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950 divide-y divide-zinc-800/80 overflow-hidden">
          {assignments.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-500">
              All course assignments and submissions are up to date. (Exams are tracked in the Examination Radar above).
            </div>
          ) : (
            assignments.map((item) => {
              const isCompleted = item.status === "completed";
              const courseTitle = inferCourseFromItem(item) || item.courseName || "General Coursework";

              return (
                <div
                  key={item.id}
                  onClick={() => handleOpenItem(item)}
                  className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-zinc-900 transition-colors cursor-pointer ${
                    isCompleted ? "opacity-60 bg-black/40" : ""
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleItemCompletion(item.id);
                      }}
                      className="mt-0.5 text-zinc-500 hover:text-white transition-colors"
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Circle className="w-4 h-4" />
                      )}
                    </button>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className={`text-xs font-semibold text-zinc-200 ${isCompleted ? "line-through text-zinc-500" : ""}`}>
                          {item.title}
                        </h4>
                        {item.priority === "critical" && <Badge variant="destructive">Due Soon</Badge>}
                      </div>
                      {item.description && (
                        <p className="text-[11px] text-zinc-400 mt-1 max-w-xl">{item.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-[10px] text-zinc-500 font-mono">
                        <span className="text-zinc-300 font-semibold">{courseTitle}</span>
                        <span>•</span>
                        <span>Due: {item.dueAt ? format(parseISO(item.dueAt), "MMM d, yyyy • h:mm a") : "No fixed cutoff"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="px-3 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-[11px] text-zinc-200 hover:text-white font-medium flex items-center gap-1.5 transition-colors border border-zinc-800"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Open Classroom</span>
                      </a>
                    )}
                  </div>
                </div>
              );
            })
          )}
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
