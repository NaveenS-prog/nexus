"use client";

import { useState, useMemo } from "react";
import { 
  CheckCircle2, 
  Circle, 
  ChevronRight
} from "lucide-react";
import { UnifiedItem, SmartDomain } from "@/lib/types";
import { smartTriageItem } from "@/lib/nlp/itemClassifier";
import { cn } from "@/components/ui/badge";

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
  const [selectedDomain, setSelectedDomain] = useState<FilterDomain>("all");

  const triagedList = useMemo(() => {
    return items
      .map((item) => {
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
          ...item,
          inferredDomain: triage.domain,
          inferredPriority: triage.priority,
        };
      })
      .filter((i) => i.inferredDomain !== "class_lecture");
  }, [items]);

  const filteredItems = useMemo(() => {
    if (selectedDomain === "all") return triagedList;
    return triagedList.filter((i) => i.inferredDomain === selectedDomain);
  }, [triagedList, selectedDomain]);

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: triagedList.length };
    triagedList.forEach((i) => {
      map[i.inferredDomain] = (map[i.inferredDomain] || 0) + 1;
    });
    return map;
  }, [triagedList]);

  const domains: Array<{ id: FilterDomain; label: string }> = [
    { id: "all", label: "All" },
    { id: "exam", label: "Exams" },
    { id: "assignment", label: "Coursework" },
    { id: "project_dev", label: "Projects" },
    { id: "personal", label: "Personal" },
  ];

  return (
    <div className="space-y-3 font-sans">
      {/* Section Header */}
      <div className="flex items-baseline justify-between border-b border-hairline pb-2">
        <h3 className="text-xs font-mono uppercase tracking-wider text-ink-secondary font-medium">
          Domain Triage
        </h3>
        <span className="text-[11px] text-ink-muted font-mono">
          {filteredItems.filter((i) => i.status !== "completed").length} pending
        </span>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        {domains.map((d) => {
          const isSelected = selectedDomain === d.id;
          const count = counts[d.id] || 0;
          return (
            <button
              key={d.id}
              onClick={() => setSelectedDomain(d.id)}
              className={cn(
                "px-2.5 py-1 rounded-[4px] text-xs font-mono transition-colors flex items-center gap-1.5",
                isSelected
                  ? "bg-olive-soft text-olive font-medium border border-olive-border"
                  : "bg-surface text-ink-muted hover:text-ink border border-hairline"
              )}
            >
              <span>{d.label}</span>
              <span className="text-[10px] text-ink-faint">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Item List */}
      {filteredItems.length === 0 ? (
        <div className="py-6 text-center text-xs text-ink-muted">
          No items categorized under this domain.
        </div>
      ) : (
        <div className="divide-y divide-hairline-subtle pt-1">
          {filteredItems.slice(0, 6).map((item) => {
            const isCompleted = item.status === "completed";

            return (
              <div
                key={item.id}
                onClick={() => onSelectItem(item)}
                className={cn(
                  "py-2.5 flex items-start justify-between gap-3 group cursor-pointer transition-colors hover:bg-canvas-secondary/40 px-2 rounded-sm -mx-2",
                  isCompleted && "opacity-50"
                )}
              >
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleStatus(item.id);
                    }}
                    className="mt-0.5 text-ink-muted hover:text-olive transition-colors shrink-0"
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-olive" />
                    ) : (
                      <Circle className="w-3.5 h-3.5 text-hairline-darker hover:text-olive" />
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    <span className={cn(
                      "text-xs font-medium text-ink transition-colors block truncate",
                      isCompleted && "line-through text-ink-muted"
                    )}>
                      {item.title}
                    </span>
                    <span className="text-[10px] font-mono text-ink-muted mt-0.5 block">
                      {item.inferredDomain} · {item.source.replace("_", " ")}
                    </span>
                  </div>
                </div>

                <ChevronRight className="w-3.5 h-3.5 text-ink-faint group-hover:text-ink-muted shrink-0 self-center" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
