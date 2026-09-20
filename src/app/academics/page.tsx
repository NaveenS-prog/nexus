"use client";

import { 
  GraduationCap, 
  CheckCircle2, 
  ExternalLink
} from "lucide-react";
import { useNexusStore } from "@/lib/data/store";
import { Badge } from "@/components/ui/badge";

export default function AcademicsPage() {
  const { items, toggleItemCompletion } = useNexusStore();

  const academicItems = items.filter((i) => i.category === "academic");
  const courses = Array.from(new Set(academicItems.map((i) => i.courseName).filter(Boolean))) as string[];

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200/90 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-zinc-950" />
            <h1 className="text-2xl font-bold tracking-tight text-zinc-950">Academics & Coursework</h1>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Coursework and academic submissions synchronization
          </p>
        </div>

        <Badge variant="outline" className="w-fit">
          Academic Workspace
        </Badge>
      </div>

      {/* Courses Grid */}
      <div className="space-y-3">
        <h2 className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-semibold">
          Enrolled Courses
        </h2>
        {courses.length === 0 ? (
          <div className="p-6 rounded-xl border border-zinc-200 bg-white/80 text-center text-xs text-zinc-400 shadow-xs">
            No enrolled courses synced.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {courses.map((courseName) => (
              <div
                key={courseName}
                className="p-4 rounded-xl border border-zinc-200/90 bg-white/90 backdrop-blur-md space-y-2 shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-zinc-950">COURSE</span>
                  <span className="text-[10px] font-mono text-zinc-400">Classroom</span>
                </div>
                <h3 className="text-sm font-bold text-zinc-950">{courseName}</h3>
                <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-500">
                  <span>{academicItems.filter(i => i.courseName === courseName && i.status !== "completed").length} active tasks</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Course Assignments List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-semibold">
            Active Assignments & Submissions
          </h2>
          <span className="text-xs text-zinc-500 font-mono">
            {academicItems.filter((i) => i.status === "completed").length}/{academicItems.length} Submitted
          </span>
        </div>

        <div className="rounded-xl border border-zinc-200/90 bg-white/90 backdrop-blur-md divide-y divide-zinc-100 overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.03),0_8px_24px_rgba(0,0,0,0.02)]">
          {academicItems.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-400">
              No academic assignments synced.
            </div>
          ) : (
            academicItems.map((item) => {
              const isCompleted = item.status === "completed";
              return (
              <div
                key={item.id}
                className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-zinc-50/80 transition-colors ${
                  isCompleted ? "opacity-60 bg-zinc-50/40" : ""
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <button
                    onClick={() => toggleItemCompletion(item.id)}
                    className="mt-0.5 text-zinc-400 hover:text-zinc-950 transition-colors"
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4 text-zinc-950" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-zinc-400" />
                    )}
                  </button>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className={`text-xs font-semibold text-zinc-900 ${isCompleted ? "line-through text-zinc-400" : ""}`}>
                        {item.title}
                      </h4>
                      {item.priority === "critical" && <Badge variant="destructive">Due Soon</Badge>}
                    </div>
                    <p className="text-[11px] text-zinc-600 mt-1 max-w-xl">{item.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-zinc-500 font-mono">
                      <span className="text-zinc-800 font-semibold">{item.courseName}</span>
                      <span>•</span>
                      <span>Due: {item.dueAt ? new Date(item.dueAt).toLocaleString() : "No deadline"}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 rounded-md bg-white hover:bg-zinc-50 text-[11px] text-zinc-800 hover:text-zinc-950 font-medium flex items-center gap-1.5 transition-colors border border-zinc-200 shadow-2xs"
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
    </div>
  );
}
