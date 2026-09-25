"use client";

import { useState, useMemo } from "react";
import { 
  CheckSquare, 
  Plus, 
  Search, 
  Filter, 
  Circle, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  Tag,
  GraduationCap,
  Layers,
  Sparkles
} from "lucide-react";
import { useNexusStore } from "@/lib/data/store";
import { UnifiedItem, Priority, Category, Source } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ItemDetailDrawer } from "@/components/dashboard/ItemDetailDrawer";
import { 
  isActionableTaskOrAssignment, 
  smartTriageItem, 
  getDomainBadgeProps, 
  isExamItem 
} from "@/lib/nlp/itemClassifier";

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
      // Don't show timetable classes/lectures in tasks view
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

      if (selectedFilter === "all") return true;
      if (selectedFilter === "exam") return isExamItem(item);
      if (selectedFilter === "assignment") {
        return smartTriageItem(item).domain === "assignment";
      }
      if (selectedFilter === "personal") {
        return smartTriageItem(item).domain === "personal";
      }
      if (selectedFilter === "project_dev") {
        return smartTriageItem(item).domain === "project_dev";
      }
      if (selectedFilter === "pending") return item.status !== "completed";
      if (selectedFilter === "completed") return item.status === "completed";
      if (selectedFilter === "critical") return item.priority === "critical";
      return true;
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

  const getSourceIcon = (source: Source) => {
    switch (source) {
      case "google_classroom": return <GraduationCap className="w-3.5 h-3.5 text-zinc-300" />;
      case "google_calendar": return <Calendar className="w-3.5 h-3.5 text-blue-400" />;
      case "notion": return <Layers className="w-3.5 h-3.5 text-zinc-300" />;
      case "google_tasks": return <CheckSquare className="w-3.5 h-3.5 text-zinc-300" />;
      default: return <CheckSquare className="w-3.5 h-3.5 text-zinc-300" />;
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-white" />
            <h1 className="text-2xl font-bold tracking-tight text-white">Unified Tasks</h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Aggregated queue from Google Tasks, Classroom, Notion, and NEXUS
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter tasks by name or tag..."
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 outline-none focus:border-white"
          />
        </div>
      </div>

      {/* Quick Add Bar */}
      <form onSubmit={handleCreateTask} className="p-2.5 rounded-xl border border-zinc-800 bg-zinc-950 flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Add a new task (e.g. 'Review OS Semaphore code')..."
          className="flex-1 min-w-[240px] bg-transparent px-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 outline-none"
        />

        <select
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value as Category)}
          className="bg-zinc-900 border border-zinc-800 rounded-md px-2 py-1 text-xs text-zinc-300 outline-none"
        >
          <option value="personal">Personal</option>
          <option value="academic">Academic</option>
          <option value="project">Project</option>
          <option value="idea">Idea</option>
        </select>

        <select
          value={newPriority}
          onChange={(e) => setNewPriority(e.target.value as Priority)}
          className="bg-zinc-900 border border-zinc-800 rounded-md px-2 py-1 text-xs text-zinc-300 outline-none"
        >
          <option value="low">Low Priority</option>
          <option value="medium">Medium Priority</option>
          <option value="high">High Priority</option>
          <option value="critical">Critical</option>
        </select>

        <Button type="submit" size="sm" className="h-8 text-xs flex items-center gap-1.5 bg-white text-black font-semibold hover:bg-zinc-200">
          <Plus className="w-3.5 h-3.5" />
          <span>Add Task</span>
        </Button>
      </form>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 border-b border-zinc-800 pb-2 overflow-x-auto text-xs">
        {[
          { id: "all", label: "All Items" },
          { id: "exam", label: "Exams" },
          { id: "assignment", label: "Assignments" },
          { id: "personal", label: "Personal" },
          { id: "project_dev", label: "Projects & Dev" },
          { id: "pending", label: "Pending" },
          { id: "completed", label: "Completed" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedFilter(tab.id)}
            className={`px-3 py-1.5 rounded-md font-medium transition-all ${
              selectedFilter === tab.id
                ? "bg-white text-black font-semibold shadow-sm"
                : "text-zinc-400 hover:text-white hover:bg-zinc-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Task List */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 divide-y divide-zinc-800/80 overflow-hidden">
        {filteredItems.length === 0 ? (
          <div className="p-12 text-center text-xs text-zinc-500">
            No tasks found in this view. Use the input above or press <kbd className="px-1 py-0.5 bg-zinc-800 rounded">Ctrl+K</kbd> to add.
          </div>
        ) : (
          filteredItems.map((item) => {
            const isCompleted = item.status === "completed";
            const triage = smartTriageItem(item);
            const domainBadge = getDomainBadgeProps(triage.domain);

            return (
              <div
                key={item.id}
                onClick={() => handleOpenItem(item)}
                className={`p-3.5 flex items-center justify-between hover:bg-zinc-900 transition-all cursor-pointer group ${
                  isCompleted ? "opacity-60 bg-black/40" : ""
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 pr-4">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleItemCompletion(item.id);
                    }}
                    className="flex-shrink-0 text-zinc-500 hover:text-white transition-colors"
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 fill-emerald-950/40" />
                    ) : (
                      <Circle className="w-4 h-4" />
                    )}
                  </button>

                  <div className="min-w-0">
                    <p className={`text-xs font-medium text-zinc-200 truncate ${isCompleted ? "line-through text-zinc-500" : "group-hover:text-white"}`}>
                      {item.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-zinc-500">
                      <span className="flex items-center gap-1 font-mono">
                        {getSourceIcon(item.source)}
                        <span>{item.source.replace("_", " ")}</span>
                      </span>
                      {item.courseName && (
                        <>
                          <span>•</span>
                          <span className="text-zinc-400">{item.courseName}</span>
                        </>
                      )}
                      {item.dueAt && (
                        <>
                          <span>•</span>
                          <span className="text-zinc-400">
                            Due {new Date(item.dueAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border font-bold uppercase ${domainBadge.bgClass} ${domainBadge.colorClass} ${domainBadge.borderClass}`}>
                    {domainBadge.shortLabel}
                  </span>
                  {item.priority === "critical" && <Badge variant="destructive">Critical</Badge>}
                  {item.priority === "high" && <Badge variant="warning">High</Badge>}
                </div>
              </div>
            );
          })
        )}
      </div>

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
