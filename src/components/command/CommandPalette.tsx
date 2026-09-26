"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { 
  CheckSquare, 
  Lightbulb, 
  FileText, 
  Compass, 
  GraduationCap, 
  Rocket, 
  BarChart3, 
  Settings, 
  RefreshCw, 
  Sparkles, 
  CalendarCheck, 
  Clock, 
  ArrowRight, 
  AlertCircle 
} from "lucide-react";
import { useNexusStore } from "@/lib/data/store";
import { FreeSlotResult } from "@/lib/types";
import { parseSlotCommand } from "@/lib/parser";
import { findFirstFreeSlot, findAllFreeSlots } from "@/lib/calendar/slotFinder";
import { format } from "date-fns";
import { isExamItem } from "@/lib/nlp/itemClassifier";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenBrainDump: () => void;
}

export function CommandPalette({ isOpen, onClose, onOpenBrainDump }: CommandPaletteProps) {
  const router = useRouter();
  const { items, projects, addItem, syncAll } = useNexusStore();
  const [search, setSearch] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setSearch("");
      setToastMessage(null);
    }
  }, [isOpen]);

  // Deterministic local slot parsing via chrono-node
  const slotData = useMemo(() => {
    const trimmed = search.trim();
    if (!trimmed) return null;

    const parsed = parseSlotCommand(trimmed);
    if (!parsed.isSlotCommand || !parsed.targetDate) return null;

    // Deterministically list every free slot within 9:00 AM - 4:00 PM (even 5 or 10 min small slots)
    const allSlots = findAllFreeSlots(
      items,
      parsed.targetDate,
      5, // capture every free slot down to 5 mins
      parsed.taskTitle
    );

    // Primary slot for instant Enter key execution
    const slot = parsed.hasExplicitTime
      ? findFirstFreeSlot(items, parsed.targetDate, parsed.durationMinutes, parsed.taskTitle, true)
      : (allSlots.find((s) => (s.durationMinutes || 0) >= parsed.durationMinutes) || allSlots[0] || null);

    return { parsed, slot, allSlots };
  }, [search, items]);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
      onClose();
    }, 1200);
  };

  const handleSelect = (action: () => void) => {
    action();
    onClose();
  };

  const handleCommitSlot = (slot: FreeSlotResult) => {
    const mins = slot.durationMinutes || 60;

    // 1. Add Task into store
    addItem({
      source: "google_tasks",
      title: slot.taskTitle,
      category: "personal",
      priority: "high",
      status: "pending",
      dueAt: slot.start,
      estimatedMinutes: mins,
      description: `Auto-scheduled free slot (${slot.formattedTimeRange})`,
    });

    // 2. Add Calendar scheduled block
    addItem({
      source: "google_calendar",
      title: slot.taskTitle,
      category: "calendar",
      priority: "medium",
      status: "pending",
      startAt: slot.start,
      dueAt: slot.end,
      estimatedMinutes: mins,
      description: `Scheduled slot for ${slot.taskTitle}`,
    });

    showToast(`✓ Scheduled "${slot.taskTitle}" for ${slot.formattedDate} (${slot.formattedTimeRange})`);
  };

  const handleCustomCommand = (input: string) => {
    const trimmed = input.trim();

    // 0. If slot preview is active, pressing Enter schedules it!
    if (slotData?.slot) {
      handleCommitSlot(slotData.slot);
      return;
    }

    if (trimmed.startsWith("/task ") || /^(?:assign\s+task|assign|add\s+task|create\s+task|task)\s+/i.test(trimmed)) {
      const parsed = parseSlotCommand(trimmed);
      const taskTitle = parsed.taskTitle || trimmed.replace(/^(?:assign\s+task|assign|add\s+task|create\s+task|task|\/task)\s+/i, "").trim();
      const dueAt = parsed.targetDate ? parsed.targetDate.toISOString() : new Date(Date.now() + 86400000).toISOString();
      if (taskTitle) {
        addItem({
          source: "google_tasks",
          title: taskTitle,
          category: "personal",
          priority: "high",
          status: "pending",
          dueAt,
          estimatedMinutes: 60,
          description: parsed.hasExplicitTime ? `Scheduled at ${parsed.targetDate?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : undefined,
        });
        showToast(`✓ Task created: "${taskTitle}"`);
      }
    } else if (trimmed.startsWith("/idea ")) {
      const ideaTitle = trimmed.replace("/idea ", "").trim();
      if (ideaTitle) {
        addItem({
          source: "notion",
          title: ideaTitle,
          category: "idea",
          priority: "medium",
          status: "pending",
          tags: ["Idea"],
        });
        showToast(`✓ Idea logged: "${ideaTitle}"`);
      }
    } else if (trimmed.startsWith("/allday ") || trimmed.startsWith("/event ")) {
      const commandBody = trimmed.replace(/^\/(?:allday|event)\s+/i, "").trim();
      const parsed = parseSlotCommand(commandBody);
      const eventTitle = parsed.taskTitle || commandBody;
      const targetDate = parsed.targetDate || new Date();
      const dateStr = format(targetDate, "yyyy-MM-dd");
      const isExam = isExamItem({ title: eventTitle });

      addItem({
        source: "google_calendar",
        title: eventTitle,
        category: isExam ? "academic" : "calendar",
        priority: isExam ? "critical" : "medium",
        status: "pending",
        startAt: `${dateStr}T00:00:00`,
        dueAt: `${dateStr}T23:59:59`,
        estimatedMinutes: isExam ? 90 : 480,
        tags: isExam ? ["Exam", "Calendar", "All Day"] : ["Calendar", "All Day"],
        metadata: { isAllDay: true },
        description: `All-day event scheduled via Command Palette`,
      });
      showToast(`✓ All-day event created: "${eventTitle}" for ${format(targetDate, "MMM d, yyyy")}`);
    } else if (trimmed.startsWith("/plan")) {
      router.push("/");
      onClose();
    } else if (trimmed.length > 0) {
      // General natural language fallback
      const parsed = parseSlotCommand(trimmed);
      const title = parsed.taskTitle || trimmed;
      const dueAt = parsed.targetDate ? parsed.targetDate.toISOString() : new Date(Date.now() + 86400000).toISOString();
      addItem({
        source: "google_tasks",
        title,
        category: "personal",
        priority: "medium",
        status: "pending",
        dueAt,
        estimatedMinutes: 30,
      });
      showToast(`✓ Task added: "${title}"`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4 bg-ink/25 backdrop-blur-sm animate-fade-in">
      <div 
        className="fixed inset-0" 
        onClick={onClose} 
      />

      <div className="relative w-full max-w-xl bg-surface border border-hairline rounded-xl shadow-2xl overflow-hidden z-10 flex flex-col text-ink">
        {/* Toast feedback */}
        {toastMessage && (
          <div className="bg-olive-light/30 border-b border-olive/30 px-4 py-2 text-xs text-ink font-semibold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-olive animate-ping" />
            {toastMessage}
          </div>
        )}

        <Command 
          className="w-full bg-transparent"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              if (slotData?.slot) {
                e.preventDefault();
                handleCommitSlot(slotData.slot);
              } else if (slotData?.allSlots && slotData.allSlots.length > 0) {
                e.preventDefault();
                handleCommitSlot(slotData.allSlots[0]);
              } else if (search.trim().length > 0) {
                e.preventDefault();
                handleCustomCommand(search);
              }
            }
          }}
        >
          <div className="flex items-center px-4 border-b border-hairline">
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder="Type natural command ('find free time wednesday to prep for viva') or /task..."
              className="w-full bg-transparent py-3.5 text-sm text-ink placeholder-ink-muted outline-none font-sans"
              autoFocus
            />
            <span className="text-[10px] font-mono text-ink-muted bg-canvas-secondary px-1.5 py-0.5 rounded border border-hairline">
              ESC
            </span>
          </div>

          {/* DETERMINISTIC FREE-SLOT PREVIEW & ALL SLOTS LIST (9:00 AM - 4:00 PM) */}
          {slotData && (
            <div className="p-3 border-b border-hairline bg-canvas-secondary/50 space-y-2.5">
              {/* Primary / Requested Slot Card */}
              {slotData.slot ? (
                <div 
                  onClick={() => handleCommitSlot(slotData.slot!)}
                  className="p-3 rounded-lg bg-surface border border-olive/40 hover:border-olive cursor-pointer transition-all flex items-start justify-between gap-3 shadow-sm group"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="p-2 rounded-md bg-olive-light/20 text-olive border border-olive/20 mt-0.5 shrink-0">
                      <CalendarCheck className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[9px] font-mono uppercase tracking-wider text-olive font-bold px-1.5 py-0.2 rounded bg-olive-light/30 border border-olive/20">
                          {slotData.parsed.hasExplicitTime ? "Target Time Slot" : "Primary Free Slot"} (9 AM – 4 PM)
                        </span>
                        <span className="text-[10px] font-mono text-ink-muted">
                          {slotData.slot.formattedDate}
                        </span>
                        {slotData.slot.durationMinutes && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-canvas-secondary text-ink border border-hairline">
                            {slotData.slot.durationMinutes < 60
                              ? `${slotData.slot.durationMinutes}m`
                              : `${Math.floor(slotData.slot.durationMinutes / 60)}h ${slotData.slot.durationMinutes % 60 ? `${slotData.slot.durationMinutes % 60}m` : ''}`}
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs font-semibold text-ink mt-1 flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-olive shrink-0" />
                        <span>{slotData.slot.formattedTimeRange}</span>
                      </h4>
                      <p className="text-[11px] text-ink-secondary mt-0.5 truncate">
                        Schedule <strong className="text-olive">'{slotData.slot.taskTitle}'</strong> for <strong className="text-ink">{slotData.slot.formattedTimeRange}</strong>?
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="px-2.5 py-1 rounded bg-olive hover:bg-olive-hover text-[10px] font-semibold text-white flex items-center gap-1 transition-colors shadow">
                      <span>Schedule</span>
                      <ArrowRight className="w-3 h-3" />
                    </span>
                    <span className="text-[9px] font-mono text-ink-muted">press ↵</span>
                  </div>
                </div>
              ) : (
                <div className="p-2.5 rounded-lg bg-canvas-secondary border border-hairline text-xs text-ink-secondary flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-ink-muted shrink-0" />
                  <span>No continuous {slotData.parsed.durationMinutes}-minute free gap found between 09:00 and 16:00 on {slotData.parsed.targetDateLabel}.</span>
                </div>
              )}

              {/* LIST OF EVERY AVAILABLE FREE SLOT (EVEN 5 OR 10 MIN SLOTS) */}
              {slotData.allSlots && slotData.allSlots.length > 0 && (
                <div className="pt-0.5">
                  <div className="flex items-center justify-between text-[11px] font-medium text-ink-secondary mb-1.5 px-0.5">
                    <span className="flex items-center gap-1.5 text-ink">
                      <span className="w-1.5 h-1.5 rounded-full bg-olive" />
                      All Free Slots (9:00 AM – 4:00 PM)
                    </span>
                    <span className="font-mono text-[10px] text-ink-muted">
                      {slotData.allSlots.length} available (down to 5m)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-[160px] overflow-y-auto pr-1">
                    {slotData.allSlots.map((s, idx) => {
                      const isSelected = slotData.slot?.start === s.start;
                      const mins = s.durationMinutes || 5;
                      const isSmall = mins <= 10;
                      return (
                        <div
                          key={idx}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCommitSlot({ ...s, taskTitle: slotData.parsed.taskTitle });
                          }}
                          className={`p-2 rounded-md border text-left cursor-pointer transition-all flex items-center justify-between gap-2 ${
                            isSelected
                              ? 'bg-olive-light/20 border-olive text-ink font-medium'
                              : 'bg-surface border-hairline hover:border-olive/50 hover:bg-canvas text-ink'
                          }`}
                        >
                          <div className="min-w-0 flex items-center gap-2">
                            <Clock className={`w-3.5 h-3.5 shrink-0 ${isSmall ? 'text-amber-600' : 'text-olive'}`} />
                            <div className="truncate">
                              <div className="text-[11px] font-mono font-medium text-ink">
                                {s.formattedTimeRange}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <span
                              className={`text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded border ${
                                isSmall
                                  ? 'bg-canvas-secondary border-hairline text-ink-muted'
                                  : 'bg-olive-light/20 border-olive/30 text-olive'
                              }`}
                            >
                              {mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h${mins % 60 ? ` ${mins % 60}m` : ''}`}
                            </span>
                            <span className="text-[10px] text-ink-muted hover:text-ink">
                              +
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          <Command.List className="max-h-[380px] overflow-y-auto p-2 space-y-1">
            <Command.Empty className="py-6 text-center text-xs text-ink-muted">
              {search.startsWith("/") ? (
                <span>Press <kbd className="px-1 py-0.5 bg-canvas-secondary rounded text-ink font-mono text-[10px]">Enter</kbd> to run "{search}"</span>
              ) : (
                <span>No matching commands or tasks found.</span>
              )}
            </Command.Empty>

            {/* Quick Actions */}
            <Command.Group heading="Quick Actions" className="[&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-ink-muted [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
              <Command.Item
                onSelect={() => handleSelect(onOpenBrainDump)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-md text-xs text-ink hover:bg-canvas-secondary cursor-pointer transition-colors"
              >
                <Sparkles className="w-4 h-4 text-olive" />
                <span className="font-medium">Open Quick Capture & Notes</span>
                <span className="ml-auto text-[10px] text-ink-muted font-mono">Capture</span>
              </Command.Item>

              <Command.Item
                onSelect={() => handleSelect(() => syncAll())}
                className="flex items-center gap-2.5 px-3 py-2 rounded-md text-xs text-ink hover:bg-canvas-secondary cursor-pointer transition-colors"
              >
                <RefreshCw className="w-4 h-4 text-ink-secondary" />
                <span className="font-medium">Sync All Integrations Now</span>
              </Command.Item>
            </Command.Group>

            {/* Navigation */}
            <Command.Group heading="Navigation" className="[&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-ink-muted [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
              <Command.Item
                onSelect={() => handleSelect(() => router.push("/"))}
                className="flex items-center gap-2.5 px-3 py-2 rounded-md text-xs text-ink-secondary hover:text-ink hover:bg-canvas-secondary cursor-pointer transition-colors"
              >
                <Compass className="w-4 h-4 text-ink-muted" />
                <span>Command Center Dashboard</span>
              </Command.Item>
              <Command.Item
                onSelect={() => handleSelect(() => router.push("/tasks"))}
                className="flex items-center gap-2.5 px-3 py-2 rounded-md text-xs text-ink-secondary hover:text-ink hover:bg-canvas-secondary cursor-pointer transition-colors"
              >
                <CheckSquare className="w-4 h-4 text-ink-muted" />
                <span>Tasks & To-Dos</span>
              </Command.Item>
              <Command.Item
                onSelect={() => handleSelect(() => router.push("/academics"))}
                className="flex items-center gap-2.5 px-3 py-2 rounded-md text-xs text-ink-secondary hover:text-ink hover:bg-canvas-secondary cursor-pointer transition-colors"
              >
                <GraduationCap className="w-4 h-4 text-ink-muted" />
                <span>Academic Deadlines & Courses</span>
              </Command.Item>
              <Command.Item
                onSelect={() => handleSelect(() => router.push("/projects"))}
                className="flex items-center gap-2.5 px-3 py-2 rounded-md text-xs text-ink-secondary hover:text-ink hover:bg-canvas-secondary cursor-pointer transition-colors"
              >
                <Rocket className="w-4 h-4 text-ink-muted" />
                <span>Projects & Workspaces</span>
              </Command.Item>
              <Command.Item
                onSelect={() => handleSelect(() => router.push("/analytics"))}
                className="flex items-center gap-2.5 px-3 py-2 rounded-md text-xs text-ink-secondary hover:text-ink hover:bg-canvas-secondary cursor-pointer transition-colors"
              >
                <BarChart3 className="w-4 h-4 text-ink-muted" />
                <span>Productivity Analytics</span>
              </Command.Item>
              <Command.Item
                onSelect={() => handleSelect(() => router.push("/settings"))}
                className="flex items-center gap-2.5 px-3 py-2 rounded-md text-xs text-ink-secondary hover:text-ink hover:bg-canvas-secondary cursor-pointer transition-colors"
              >
                <Settings className="w-4 h-4 text-ink-muted" />
                <span>Settings & Integrations</span>
              </Command.Item>
            </Command.Group>

            {/* Scheduled Examinations */}
            {items.some(isExamItem) && (
              <Command.Group heading="Scheduled Examinations" className="[&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-ink-muted [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
                {items.filter(isExamItem).slice(0, 4).map((item) => (
                  <Command.Item
                    key={item.id}
                    onSelect={() => handleSelect(() => router.push("/academics"))}
                    className="flex items-center justify-between px-3 py-2 rounded-md text-xs text-ink-secondary hover:text-ink hover:bg-canvas-secondary cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-1.5 h-1.5 rounded-full bg-terracotta shrink-0" />
                      <span className="truncate font-medium text-ink">{item.title}</span>
                    </div>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-terracotta-light/30 text-terracotta border border-terracotta/20 uppercase font-bold shrink-0">
                      EXAM
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Active Tasks search */}
            <Command.Group heading="Active Tasks & Deliverables" className="[&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-ink-muted [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
              {items.filter((i) => !isExamItem(i)).slice(0, 5).map((item) => (
                <Command.Item
                  key={item.id}
                  onSelect={() => handleSelect(() => router.push("/tasks"))}
                  className="flex items-center justify-between px-3 py-2 rounded-md text-xs text-ink-secondary hover:text-ink hover:bg-canvas-secondary cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-1.5 h-1.5 rounded-full bg-ink-muted shrink-0" />
                    <span className="truncate text-ink">{item.title}</span>
                  </div>
                  <span className="text-[10px] text-ink-muted uppercase shrink-0 font-mono">{item.source.replace("_", " ")}</span>
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>

          {/* Footer Shortcuts Help */}
          <div className="px-4 py-2 bg-canvas-secondary border-t border-hairline flex items-center justify-between text-[11px] text-ink-muted">
            <div className="flex items-center gap-3">
              <span><kbd className="text-ink">↑↓</kbd> navigate</span>
              <span><kbd className="text-ink">↵</kbd> select</span>
              <span><kbd className="text-ink">ESC</kbd> close</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-olive font-mono">Chrono-Node</span>
            </div>
          </div>
        </Command>
      </div>
    </div>
  );
}
