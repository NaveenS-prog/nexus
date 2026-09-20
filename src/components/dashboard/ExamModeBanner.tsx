"use client";

import { BookOpen, Calendar, AlertTriangle, CheckCircle, GraduationCap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { UnifiedItem } from "@/lib/types";

interface ExamModeBannerProps {
  items: UnifiedItem[];
  onSelectItem: (item: UnifiedItem) => void;
}

export function ExamModeBanner({ items, onSelectItem }: ExamModeBannerProps) {
  // Academic priorities
  const academicItems = items
    .filter((item) => item.category === "academic" && item.status !== "completed")
    .sort((a, b) => {
      const dateA = a.dueAt ? new Date(a.dueAt).getTime() : Infinity;
      const dateB = b.dueAt ? new Date(b.dueAt).getTime() : Infinity;
      return dateA - dateB;
    });

  const upcomingExams = [
    { name: "Operating Systems Midterm", date: "Oct 3", daysLeft: "4 days", code: "CS-301", critical: true },
    { name: "COA Internal Assessment", date: "Oct 6", daysLeft: "7 days", code: "CS-302", critical: false },
    { name: "Discrete Mathematics Exam", date: "Oct 8", daysLeft: "9 days", code: "MA-204", critical: false },
  ];

  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-950 p-5 space-y-4 shadow-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-white text-black border border-white">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold tracking-wider text-white uppercase font-mono">
                EXAM MODE ACTIVE
              </h2>
              <Badge variant="default">Prioritizing Coursework & Exams</Badge>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Course syllabus countdowns and academic assignment queues elevated to top priority
            </p>
          </div>
        </div>
      </div>

      {/* Grid: Upcoming Exams & Academic Priorities */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
        {/* Upcoming Exams */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-zinc-300">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-white" />
              Upcoming Exams
            </span>
            <span className="text-[10px] text-zinc-500 font-mono">Semester Fall 2026</span>
          </div>

          <div className="space-y-1.5">
            {upcomingExams.map((exam) => (
              <div
                key={exam.name}
                className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-zinc-200">{exam.name}</span>
                    <span className="text-[10px] font-mono text-zinc-400">{exam.code}</span>
                  </div>
                  <span className="text-[11px] text-zinc-500">{exam.date}</span>
                </div>
                <Badge variant={exam.critical ? "destructive" : "warning"}>
                  {exam.daysLeft}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Academic Priorities Queue */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-zinc-300">
            <span className="flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-white" />
              Academic Priorities Queue
            </span>
            <span className="text-[10px] text-zinc-500">{academicItems.length} pending</span>
          </div>

          <div className="space-y-1.5">
            {academicItems.slice(0, 3).map((item) => (
              <div
                key={item.id}
                onClick={() => onSelectItem(item)}
                className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-white cursor-pointer transition-all flex items-center justify-between text-xs group"
              >
                <div className="min-w-0 pr-2">
                  <p className="text-zinc-200 font-medium truncate group-hover:text-white transition-colors">
                    {item.title}
                  </p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">{item.courseName || "Academic"}</p>
                </div>
                <Badge variant={item.priority === "critical" ? "destructive" : "warning"} className="flex-shrink-0">
                  {item.priority.toUpperCase()}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
