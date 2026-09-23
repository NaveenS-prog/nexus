"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { 
  Sparkles, 
  GraduationCap, 
  FileText, 
  Calendar as CalendarIcon, 
  CheckSquare, 
  Code, 
  Play, 
  CheckCircle2, 
  Circle, 
  ChevronRight, 
  Layers, 
  Clock, 
  User, 
  ArrowRight,
  Info
} from "lucide-react";
import { UnifiedItem, SmartDomain } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  smartTriageItem, 
  getDomainBadgeProps, 
  getSmartDomain 
} from "@/lib/nlp/itemClassifier";
import { format, parseISO } from "date-fns";

interface SmartLifeTriageCardProps {
  items: UnifiedItem[];
  onToggleStatus: (id: string) => void;
  onSelectItem: (item: UnifiedItem) => void;
}

type FilterDomain = "all" | SmartDomain;

export function SmartLifeTriageCard({
  items,
  onToggleStatus,
  onSelectItem,
}: SmartLifeTriageCardProps) {
  const router = useRouter();
  const [selectedDomain, setSelectedDomain] = useState<FilterDomain>("all");

  // Run autonomous smart triage on all items
  const triagedList = useMemo(() => {
    return items.map((item) => {
      const triage = smartTriageItem({
        title: item.title,
        description: item.description,
        source: item.source,
        category: item.category,
        location: item.metadata?.location,
        dueAt: item.dueAt,
        startAt: item.startAt,
      });

      return {
        item,
        triage,
      };
    });
  }, [items]);

  // Aggregate counts by domain for pending/active items
  const domainCounts = useMemo(() => {
    const counts = {
      all: 0,
      exam: 0,
      assignment: 0,
      class_lecture: 0,
      personal: 0,
      project_dev: 0,
      meeting: 0,
    };

    for (const { item, triage } of triagedList) {
      if (item.status !== "completed") {
        counts.all += 1;
        counts[triage.domain] += 1;
      }
    }

    return counts;
  }, [triagedList]);

  // Filtered list based on selected domain
  const filteredItems = useMemo(() => {
    return triagedList.filter(({ item, triage }) => {
      if (selectedDomain === "all") {
        // In "all", show actionable tasks, assignments, and exams first
        return item.status !== "completed";
      }
      return triage.domain === selectedDomain && item.status !== "completed";
    });
  }, [triagedList, selectedDomain]);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-4 shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-white text-black shadow-sm">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-white tracking-wider uppercase font-mono">
                Autonomous Life Triage
              </h3>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold">
                AUTO-TRIAGED
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Zero manual organizing. NEXUS automatically sorts exams, assignments, classes, personal tasks, and projects.
            </p>
          </div>
        </div>

        <Badge variant="outline" className="font-mono text-[10px] self-start sm:self-auto">
          {domainCounts.all} Active Items Sorted
        </Badge>
      </div>

      {/* Domain Filter Pills Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {/* All Tab */}
        <button
          type="button"
          onClick={() => setSelectedDomain("all")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer ${
            selectedDomain === "all"
              ? "bg-white text-black font-semibold shadow-sm"
              : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700"
          }`}
        >
          <span>All</span>
          <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
            selectedDomain === "all" ? "bg-zinc-200 text-zinc-900" : "bg-zinc-800 text-zinc-400"
          }`}>
            {domainCounts.all}
          </span>
        </button>

        {/* Exams Pill */}
        <button
          type="button"
          onClick={() => setSelectedDomain("exam")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer ${
            selectedDomain === "exam"
              ? "bg-rose-500/30 text-rose-200 border border-rose-500/60 font-semibold shadow-sm"
              : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-rose-300 hover:border-rose-900"
          }`}
        >
          <GraduationCap className="w-3.5 h-3.5 text-rose-400" />
          <span>Exams</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40">
            {domainCounts.exam}
          </span>
        </button>

        {/* Assignments Pill */}
        <button
          type="button"
          onClick={() => setSelectedDomain("assignment")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer ${
            selectedDomain === "assignment"
              ? "bg-blue-500/30 text-blue-200 border border-blue-500/60 font-semibold shadow-sm"
              : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-blue-300 hover:border-blue-900"
          }`}
        >
          <FileText className="w-3.5 h-3.5 text-blue-400" />
          <span>Assignments</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40">
            {domainCounts.assignment}
          </span>
        </button>

        {/* Classes Pill */}
        <button
          type="button"
          onClick={() => setSelectedDomain("class_lecture")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer ${
            selectedDomain === "class_lecture"
              ? "bg-purple-500/30 text-purple-200 border border-purple-500/60 font-semibold shadow-sm"
              : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-purple-300 hover:border-purple-900"
          }`}
        >
          <CalendarIcon className="w-3.5 h-3.5 text-purple-400" />
          <span>Classes</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
            {domainCounts.class_lecture}
          </span>
        </button>

        {/* Personal Life Pill */}
        <button
          type="button"
          onClick={() => setSelectedDomain("personal")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer ${
            selectedDomain === "personal"
              ? "bg-emerald-500/30 text-emerald-200 border border-emerald-500/60 font-semibold shadow-sm"
              : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-emerald-300 hover:border-emerald-900"
          }`}
        >
          <User className="w-3.5 h-3.5 text-emerald-400" />
          <span>Personal Life</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            {domainCounts.personal}
          </span>
        </button>

        {/* Projects & Dev Pill */}
        <button
          type="button"
          onClick={() => setSelectedDomain("project_dev")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer ${
            selectedDomain === "project_dev"
              ? "bg-amber-500/30 text-amber-200 border border-amber-500/60 font-semibold shadow-sm"
              : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-amber-300 hover:border-amber-900"
          }`}
        >
          <Code className="w-3.5 h-3.5 text-amber-400" />
          <span>Projects & Dev</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
            {domainCounts.project_dev}
          </span>
        </button>
      </div>

      {/* Triaged Items List */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 divide-y divide-zinc-800/80 overflow-hidden">
        {filteredItems.length === 0 ? (
          <div className="p-8 text-center text-xs text-zinc-500 space-y-1">
            <p className="text-zinc-300 font-medium">No active items in this domain.</p>
            <p className="text-[11px] text-zinc-500">
              Items from your Google Calendar, Google Tasks, and Notion are automatically routed here.
            </p>
          </div>
        ) : (
          filteredItems.slice(0, 6).map(({ item, triage }) => {
            const badgeProps = getDomainBadgeProps(triage.domain);
            const isCompleted = item.status === "completed";

            let dateLabel = "No deadline";
            if (item.startAt || item.dueAt) {
              try {
                const d = parseISO(item.startAt || item.dueAt || "");
                dateLabel = format(d, "EEE, MMM d");
              } catch {}
            }

            return (
              <div
                key={item.id}
                onClick={() => onSelectItem(item)}
                className="p-3 hover:bg-zinc-900/90 transition-all flex items-start justify-between gap-3 group cursor-pointer"
              >
                {/* Left: Checkbox + Title + AI reasoning subtext */}
                <div className="flex items-start gap-3 min-w-0 pr-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleStatus(item.id);
                    }}
                    title={isCompleted ? "Mark incomplete" : "Mark complete"}
                    className="p-0.5 text-zinc-500 hover:text-white transition-colors shrink-0 mt-0.5 cursor-pointer"
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 fill-emerald-950/40" />
                    ) : (
                      <Circle className="w-4 h-4 hover:scale-110 transition-transform" />
                    )}
                  </button>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`text-xs font-semibold text-zinc-200 truncate ${isCompleted ? "line-through text-zinc-500" : "group-hover:text-white"}`}>
                        {item.title}
                      </p>

                      {/* Smart Domain Pill */}
                      <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded border font-bold uppercase shrink-0 ${badgeProps.bgClass} ${badgeProps.colorClass} ${badgeProps.borderClass}`}>
                        {badgeProps.shortLabel}
                      </span>
                    </div>

                    {/* AI Suggested Action & Reason */}
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-zinc-400 font-mono flex-wrap">
                      <span className="text-zinc-500">{dateLabel}</span>
                      <span>•</span>
                      <span className="text-zinc-300 italic truncate max-w-[280px]">
                        "{triage.suggestedAction}"
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Quick Focus Action & Detail Chevron */}
                <div className="flex items-center gap-2 shrink-0">
                  {triage.isActionableTask && !isCompleted && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/focus?taskId=${item.id}`);
                      }}
                      className="px-2 py-1 rounded bg-zinc-800 hover:bg-white hover:text-black text-zinc-300 transition-all flex items-center gap-1 text-[11px] font-medium"
                      title="Launch focused session"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span className="hidden sm:inline">Focus</span>
                    </button>
                  )}

                  <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-300 transition-colors" />
                </div>
              </div>
            );
          })
        )}
      </div>

      {filteredItems.length > 6 && (
        <div className="text-center pt-1">
          <button
            type="button"
            onClick={() => router.push("/tasks")}
            className="text-xs text-zinc-400 hover:text-white font-mono flex items-center justify-center gap-1 mx-auto transition-colors"
          >
            <span>View all {filteredItems.length} items in Unified Tasks</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
