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
    <div className="rounded-xl border border-hairline bg-surface p-5 space-y-4 shadow-sm text-ink">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-terracotta text-white">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold tracking-wider text-ink uppercase font-mono">
                EXAM MODE ACTIVE
              </h2>
              <Badge variant="terracotta">Coursework & Exams</Badge>
            </div>
            <p className="text-xs text-ink-muted mt-0.5">
              Course syllabus countdowns and academic assignment queues elevated to top priority
            </p>
          </div>
        </div>
      </div>

      {/* Grid: Upcoming Exams & Academic Priorities */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
        {/* Upcoming Exams */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-ink">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-terracotta" />
              Upcoming Exams
            </span>
            <span className="text-[10px] text-ink-muted font-mono">Semester Fall 2026</span>
          </div>

          <div className="space-y-1.5">
            {upcomingExams.map((exam) => (
              <div
                key={exam.name}
                className="p-2.5 rounded-lg bg-canvas border border-hairline flex items-center justify-between text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-ink">{exam.name}</span>
                    <span className="text-[10px] font-mono text-ink-muted">{exam.code}</span>
                  </div>
                  <span className="text-[11px] text-ink-muted">{exam.date}</span>
                </div>
                <Badge variant={exam.critical ? "terracotta" : "parchment"}>
                  {exam.daysLeft}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Academic Priorities Queue */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-ink">
            <span className="flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-olive" />
              Academic Priorities Queue
            </span>
            <span className="text-[10px] text-ink-muted font-mono">{academicItems.length} pending</span>
          </div>

          <div className="space-y-1.5">
            {academicItems.slice(0, 3).map((item) => (
              <div
                key={item.id}
                onClick={() => onSelectItem(item)}
                className="p-2.5 rounded-lg bg-canvas border border-hairline hover:border-olive/50 cursor-pointer transition-all flex items-center justify-between text-xs group"
              >
                <div className="min-w-0 pr-2">
                  <p className="text-ink font-medium truncate group-hover:text-olive transition-colors">
                    {item.title}
                  </p>
                  <p className="text-[10px] text-ink-muted mt-0.5">{item.courseName || "Academic"}</p>
                </div>
                <Badge variant={item.priority === "critical" ? "terracotta" : "outline"} className="flex-shrink-0">
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
