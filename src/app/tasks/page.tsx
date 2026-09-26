"use client";

import { useState, useMemo } from "react";
import { 
  Plus, 
  Search, 
  Circle, 
  CheckCircle2, 
  ChevronRight
} from "lucide-react";
import { useNexusStore } from "@/lib/data/store";
import { UnifiedItem, Priority, Category } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ItemDetailDrawer } from "@/components/dashboard/ItemDetailDrawer";
import { 
  isActionableTaskOrAssignment, 
  smartTriageItem, 
  isExamItem 
} from "@/lib/nlp/itemClassifier";
import { format, parseISO, isSameDay, isTomorrow } from "date-fns";
import { cn } from "@/components/ui/badge";

export default function TasksPage() {
  const { items, addItem, toggleItemCompletion, deleteItem } = useNexusStore();
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<Category>("personal");
  const [newPriority, setNewPriority] = useState<Priority>("medium");
  const [selectedItem, setSelectedItem] = useState<UnifiedItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (!isActionableTaskOrAssignment(item) || smartTriageItem(item).domain === "class_lecture") {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesDesc = item.description?.toLowerCase().includes(q);
        const matchesTag = item.tags?.some((t) => t.toLowerCase().includes(q));
        if (!matchesTitle && !matchesDesc && !matchesTag) return false;
      }

      if (selectedFilter === "all") return item.status !== "completed";
      if (selectedFilter === "exam") return isExamItem(item) && item.status !== "completed";
      if (selectedFilter === "assignment") {
        return smartTriageItem(item).domain === "assignment" && item.status !== "completed";
      }
      if (selectedFilter === "personal") {
        return smartTriageItem(item).domain === "personal" && item.status !== "completed";
      }
      if (selectedFilter === "project_dev") {
        return smartTriageItem(item).domain === "project_dev" && item.status !== "completed";
      }
      if (selectedFilter === "completed") return item.status === "completed";
      return true;
    }).sort((a, b) => {
      // Completed items sink to bottom
      if (a.status === "completed" && b.status !== "completed") return 1;
      if (a.status !== "completed" && b.status === "completed") return -1;

      // Chronological sort by event start date or task due date
      const isEventA = a.category === "calendar" || a.category === "academic" || a.source === "google_calendar" || isExamItem(a);
      const isEventB = b.category === "calendar" || b.category === "academic" || b.source === "google_calendar" || isExamItem(b);
      const timeA = (isEventA ? (a.startAt || a.dueAt) : (a.dueAt || a.startAt)) || "9999";
      const timeB = (isEventB ? (b.startAt || b.dueAt) : (b.dueAt || b.startAt)) || "9999";
      return timeA.localeCompare(timeB);
    });
  }, [items, selectedFilter, searchQuery]);

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    addItem({
      source: "nexus",
      title: newTitle.trim(),
      category: newCategory,
      priority: newPriority,
      status: "pending",
      estimatedMinutes: 30,
      dueAt: new Date(Date.now() + 86400000).toISOString(),
      tags: ["Quick Add"],
    });

    setNewTitle("");
  };

  const handleOpenItem = (item: UnifiedItem) => {
    setSelectedItem(item);
    setDrawerOpen(true);
  };

  const formatDue = (item: UnifiedItem) => {
    const isAllDay = Boolean(item.metadata?.isAllDay || item.tags?.includes("All Day"));
    // For calendar events, exams, and classes: the scheduled date is startAt!
    // For tasks/coursework: the deadline is dueAt (falling back to startAt).
    const isEventOrExam = item.category === "calendar" || item.category === "academic" || item.source === "google_calendar" || isExamItem(item);
    const dateStr = isEventOrExam 
      ? (item.startAt || item.dueAt) 
      : (item.dueAt || item.startAt);
    if (!dateStr) return undefined;
    try {
      const d = parseISO(dateStr);
      const today = new Date();
      if (isSameDay(d, today)) {
        return isAllDay ? "Today" : `Today · ${format(d, "h:mm a")}`;
      }
      if (isTomorrow(d)) {
        return isAllDay ? "Tomorrow" : `Tomorrow · ${format(d, "h:mm a")}`;
      }
      return format(d, "MMM d");
    } catch {
      return undefined;
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-8 animate-fade-in font-sans">
      {/* Editorial Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-hairline pb-6">
        <div>
          <h1 className="font-editorial text-3xl font-normal text-ink tracking-tight">
            Tasks
          </h1>
          <p className="text-xs text-ink-secondary mt-1">
            Aggregated queue across Google Tasks, Classroom, Notion, and NEXUS
          </p>
        </div>

        {/* Minimal Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter tasks..."
            className="w-full bg-surface border border-hairline rounded-sm pl-8 pr-3 py-1.5 text-xs text-ink placeholder-ink-muted outline-none focus:border-olive transition-colors"
          />
        </div>
      </div>

      {/* Quick Add Bar */}
      <form onSubmit={handleCreateTask} className="p-2 rounded-md border border-hairline bg-surface flex flex-wrap items-center gap-2 shadow-subtle">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Add a new task (e.g. 'Finish OS Semaphore code')..."
          className="flex-1 min-w-[220px] bg-transparent px-3 py-1.5 text-xs text-ink placeholder-ink-muted outline-none"
        />

        <select
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value as Category)}
          className="bg-canvas-secondary border border-hairline rounded-sm px-2 py-1 text-xs text-ink-secondary outline-none font-mono"
        >
          <option value="personal">Personal</option>
          <option value="academic">Academic</option>
          <option value="project">Project</option>
          <option value="idea">Idea</option>
        </select>

        <select
          value={newPriority}
          onChange={(e) => setNewPriority(e.target.value as Priority)}
          className="bg-canvas-secondary border border-hairline rounded-sm px-2 py-1 text-xs text-ink-secondary outline-none font-mono"
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>

        <Button type="submit" variant="olive" size="sm" className="h-7 text-xs flex items-center gap-1.5">
          <Plus className="w-3 h-3" />
          <span>Add</span>
        </Button>
      </form>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-hairline pb-2 overflow-x-auto text-xs">
        {[
          { id: "all", label: "Active" },
          { id: "exam", label: "Exams" },
          { id: "assignment", label: "Coursework" },
          { id: "personal", label: "Personal" },
          { id: "project_dev", label: "Projects" },
          { id: "completed", label: "Completed" },
        ].map((tab) => {
          const isSelected = selectedFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSelectedFilter(tab.id)}
              className={cn(
                "px-2.5 py-1 rounded-sm text-xs font-mono transition-colors",
                isSelected
                  ? "bg-olive-soft text-olive font-medium border border-olive-border"
                  : "text-ink-muted hover:text-ink hover:bg-canvas-secondary/60"
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Task List (Things 3 / Linear style clean rows) */}
      <div className="divide-y divide-hairline-subtle">
        {filteredItems.length === 0 ? (
          <div className="py-16 text-center text-xs text-ink-muted font-sans">
            {selectedFilter === "completed" 
              ? "No completed tasks yet." 
              : "No tasks in this view. Everything is up to date."}
          </div>
        ) : (
          filteredItems.map((item) => {
            const isCompleted = item.status === "completed";
            const dueLabel = formatDue(item);

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
                      {dueLabel && (
                        <span className={item.priority === "critical" && !isCompleted ? "text-terracotta font-medium" : ""}>
                          {dueLabel}
                        </span>
                      )}
                      {dueLabel && item.estimatedMinutes && <span>·</span>}
                      {item.estimatedMinutes && <span>{item.estimatedMinutes}m</span>}
                      {item.courseName && <span>·</span>}
                      {item.courseName && <span className="text-ink-secondary">{item.courseName}</span>}
                      <span>·</span>
                      <span className="capitalize">{item.category}</span>
                    </div>
                  </div>
                </div>

                <ChevronRight className="w-3.5 h-3.5 text-ink-faint group-hover:text-ink-muted transition-colors shrink-0 self-center" />
              </div>
            );
          })
        )}
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
