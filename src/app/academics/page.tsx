"use client";

import { useState } from "react";
import { 
  GraduationCap, 
  BookOpen, 
  Calendar, 
  CheckCircle2, 
  ExternalLink, 
  Clock, 
  AlertCircle,
  FileText
} from "lucide-react";
import { useNexusStore } from "@/lib/data/store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function AcademicsPage() {
  const { items, toggleItemCompletion } = useNexusStore();

  const academicItems = items.filter((i) => i.category === "academic");

  // Dynamically extract courses from connected items, avoiding any made-up courses
  const courses = Array.from(new Set(academicItems.map((i) => i.courseName).filter(Boolean))) as string[];

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-6">
        <div>
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-amber-400" />
            <h1 className="text-2xl font-bold tracking-tight text-white">Academics & Coursework</h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Coursework and academic submissions synchronization
          </p>
        </div>

        <Badge variant="warning" className="w-fit">
          Academic Workspace
        </Badge>
      </div>

      {/* Courses Grid */}
      <div className="space-y-3">
        <h2 className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-semibold">
          Enrolled Courses
        </h2>
        {courses.length === 0 ? (
          <div className="p-6 rounded-xl border border-white/[0.08] bg-nexus-900/30 text-center text-xs text-zinc-500">
            No enrolled courses synced. (Google Classroom integration is deferred).
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {courses.map((courseName) => (
              <div
                key={courseName}
                className="p-4 rounded-xl border border-amber-500/30 bg-amber-950/20 space-y-2 backdrop-blur-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-amber-400">COURSE</span>
                  <span className="text-[10px] font-mono text-zinc-400">Classroom</span>
                </div>
                <h3 className="text-sm font-bold text-zinc-100">{courseName}</h3>
                <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-zinc-500">
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

        <div className="rounded-xl border border-white/[0.08] bg-nexus-900/50 backdrop-blur-sm divide-y divide-white/[0.04] overflow-hidden">
          {academicItems.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-500">
              No academic assignments synced.
            </div>
          ) : (
            academicItems.map((item) => {
              const isCompleted = item.status === "completed";
              return (
              <div
                key={item.id}
                className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/[0.03] transition-colors ${
                  isCompleted ? "opacity-60 bg-black/20" : ""
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <button
                    onClick={() => toggleItemCompletion(item.id)}
                    className="mt-0.5 text-zinc-500 hover:text-indigo-400 transition-colors"
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-zinc-500" />
                    )}
                  </button>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className={`text-xs font-semibold text-zinc-200 ${isCompleted ? "line-through text-zinc-500" : ""}`}>
                        {item.title}
                      </h4>
                      {item.priority === "critical" && <Badge variant="destructive">Due Soon</Badge>}
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-1 max-w-xl">{item.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-zinc-500 font-mono">
                      <span className="text-amber-400">{item.courseName}</span>
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
                      className="px-3 py-1 rounded bg-white/[0.06] hover:bg-white/[0.1] text-[11px] text-indigo-300 font-medium flex items-center gap-1.5 transition-colors border border-white/[0.08]"
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
