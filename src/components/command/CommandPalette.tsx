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
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div 
        className="fixed inset-0" 
        onClick={onClose} 
      />

      <div className="relative w-full max-w-xl bg-black border border-zinc-800 rounded-xl shadow-2xl overflow-hidden z-10 flex flex-col">
        {/* Toast feedback */}
        {toastMessage && (
          <div className="bg-emerald-950/90 border-b border-emerald-800/80 px-4 py-2 text-xs text-emerald-200 font-semibold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
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
          <div className="flex items-center px-4 border-b border-zinc-800">
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder="Type natural command ('find free time wednesday to prep for viva') or /task..."
              className="w-full bg-transparent py-3.5 text-sm text-zinc-100 placeholder-zinc-500 outline-none font-sans"
              autoFocus
            />
            <span className="text-[10px] font-mono text-zinc-400 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
              ESC
            </span>
          </div>

          {/* DETERMINISTIC FREE-SLOT PREVIEW & ALL SLOTS LIST (9:00 AM - 4:00 PM) */}
          {slotData && (
            <div className="p-3 border-b border-zinc-800 bg-emerald-950/20 space-y-2.5">
              {/* Primary / Requested Slot Card */}
              {slotData.slot ? (
                <div 
                  onClick={() => handleCommitSlot(slotData.slot!)}
                  className="p-3 rounded-lg bg-zinc-900/95 border border-emerald-500/60 hover:border-emerald-400 cursor-pointer transition-all flex items-start justify-between gap-3 shadow-lg group"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="p-2 rounded-md bg-emerald-950 text-emerald-400 border border-emerald-800/80 mt-0.5 shrink-0">
                      <CalendarCheck className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[9px] font-mono uppercase tracking-wider text-emerald-400 font-bold px-1.5 py-0.2 rounded bg-emerald-950/80 border border-emerald-800">
                          {slotData.parsed.hasExplicitTime ? "Target Time Slot" : "Primary Free Slot"} (9 AM – 4 PM)
                        </span>
                        <span className="text-[10px] font-mono text-zinc-400">
                          {slotData.slot.formattedDate}
                        </span>
                        {slotData.slot.durationMinutes && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-emerald-300 border border-zinc-700">
                            {slotData.slot.durationMinutes < 60
                              ? `${slotData.slot.durationMinutes}m`
                              : `${Math.floor(slotData.slot.durationMinutes / 60)}h ${slotData.slot.durationMinutes % 60 ? `${slotData.slot.durationMinutes % 60}m` : ''}`}
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs font-bold text-white mt-1 flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span>{slotData.slot.formattedTimeRange}</span>
                      </h4>
                      <p className="text-[11px] text-zinc-300 mt-0.5 truncate">
                        Schedule <strong className="text-emerald-300">'{slotData.slot.taskTitle}'</strong> for <strong className="text-white">{slotData.slot.formattedTimeRange}</strong>?
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="px-2.5 py-1 rounded bg-emerald-600 group-hover:bg-emerald-500 text-[10px] font-semibold text-white flex items-center gap-1 transition-colors shadow">
                      <span>Schedule</span>
                      <ArrowRight className="w-3 h-3" />
                    </span>
                    <span className="text-[9px] font-mono text-zinc-400">press ↵</span>
                  </div>
                </div>
              ) : (
                <div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-800/60 text-xs text-amber-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>No continuous {slotData.parsed.durationMinutes}-minute free gap found between 09:00 and 16:00 on {slotData.parsed.targetDateLabel}.</span>
                </div>
              )}

              {/* LIST OF EVERY AVAILABLE FREE SLOT (EVEN 5 OR 10 MIN SLOTS) */}
              {slotData.allSlots && slotData.allSlots.length > 0 && (
                <div className="pt-0.5">
                  <div className="flex items-center justify-between text-[11px] font-medium text-zinc-400 mb-1.5 px-0.5">
                    <span className="flex items-center gap-1.5 text-zinc-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      All Free Slots (9:00 AM – 4:00 PM)
                    </span>
                    <span className="font-mono text-[10px] text-zinc-400">
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
                              ? 'bg-emerald-950/80 border-emerald-500/80 text-white'
                              : 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800 text-zinc-200'
                          }`}
                        >
                          <div className="min-w-0 flex items-center gap-2">
                            <Clock className={`w-3.5 h-3.5 shrink-0 ${isSmall ? 'text-amber-400' : 'text-emerald-400'}`} />
                            <div className="truncate">
                              <div className="text-[11px] font-mono font-medium text-zinc-100">
                                {s.formattedTimeRange}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <span
                              className={`text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded border ${
                                isSmall
                                  ? 'bg-amber-950/70 border-amber-800/80 text-amber-300'
                                  : 'bg-emerald-950/70 border-emerald-800/80 text-emerald-300'
                              }`}
                            >
                              {mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h${mins % 60 ? ` ${mins % 60}m` : ''}`}
                            </span>
                            <span className="text-[10px] text-zinc-500 hover:text-white">
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
            <Command.Empty className="py-6 text-center text-xs text-zinc-500">
              {search.startsWith("/") ? (
                <span>Press <kbd className="px-1 py-0.5 bg-zinc-800 rounded text-zinc-300">Enter</kbd> to run "{search}"</span>
              ) : (
                <span>No matching commands or tasks found.</span>
              )}
            </Command.Empty>

            {/* Quick Actions */}
            <Command.Group heading="Quick Actions">
              <Command.Item
                onSelect={() => handleSelect(onOpenBrainDump)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-md text-xs text-zinc-300 hover:bg-zinc-900 hover:text-white cursor-pointer transition-colors"
              >
                <Sparkles className="w-4 h-4 text-white" />
                <span className="font-medium">Open Brain Dump & Quick Capture</span>
                <span className="ml-auto text-[10px] text-zinc-500 font-mono">Capture</span>
              </Command.Item>

              <Command.Item
                onSelect={() => handleSelect(() => syncAll())}
                className="flex items-center gap-2.5 px-3 py-2 rounded-md text-xs text-zinc-300 hover:bg-zinc-900 hover:text-white cursor-pointer transition-colors"
              >
                <RefreshCw className="w-4 h-4 text-white" />
                <span className="font-medium">Sync All Integrations Now</span>
              </Command.Item>
            </Command.Group>

            {/* Navigation */}
            <Command.Group heading="Navigation">
              <Command.Item
                onSelect={() => handleSelect(() => router.push("/"))}
                className="flex items-center gap-2.5 px-3 py-2 rounded-md text-xs text-zinc-300 hover:bg-zinc-900 hover:text-white cursor-pointer transition-colors"
              >
                <Compass className="w-4 h-4 text-zinc-400" />
                <span>Command Center Dashboard</span>
              </Command.Item>
              <Command.Item
                onSelect={() => handleSelect(() => router.push("/tasks"))}
                className="flex items-center gap-2.5 px-3 py-2 rounded-md text-xs text-zinc-300 hover:bg-zinc-900 hover:text-white cursor-pointer transition-colors"
              >
                <CheckSquare className="w-4 h-4 text-zinc-400" />
                <span>Tasks & To-Dos</span>
              </Command.Item>
              <Command.Item
                onSelect={() => handleSelect(() => router.push("/academics"))}
                className="flex items-center gap-2.5 px-3 py-2 rounded-md text-xs text-zinc-300 hover:bg-zinc-900 hover:text-white cursor-pointer transition-colors"
              >
                <GraduationCap className="w-4 h-4 text-zinc-400" />
                <span>Academic Deadlines & Courses</span>
              </Command.Item>
              <Command.Item
                onSelect={() => handleSelect(() => router.push("/projects"))}
                className="flex items-center gap-2.5 px-3 py-2 rounded-md text-xs text-zinc-300 hover:bg-zinc-900 hover:text-white cursor-pointer transition-colors"
              >
                <Rocket className="w-4 h-4 text-zinc-400" />
                <span>Projects & Sprint Kanban</span>
              </Command.Item>
              <Command.Item
                onSelect={() => handleSelect(() => router.push("/analytics"))}
                className="flex items-center gap-2.5 px-3 py-2 rounded-md text-xs text-zinc-300 hover:bg-zinc-900 hover:text-white cursor-pointer transition-colors"
              >
                <BarChart3 className="w-4 h-4 text-zinc-400" />
                <span>Productivity Analytics</span>
              </Command.Item>
              <Command.Item
                onSelect={() => handleSelect(() => router.push("/settings"))}
                className="flex items-center gap-2.5 px-3 py-2 rounded-md text-xs text-zinc-300 hover:bg-zinc-900 hover:text-white cursor-pointer transition-colors"
              >
                <Settings className="w-4 h-4 text-zinc-400" />
                <span>Settings & Integrations</span>
              </Command.Item>
            </Command.Group>

            {/* Tasks search */}
            <Command.Group heading="Active Items">
              {items.slice(0, 5).map((item) => (
                <Command.Item
                  key={item.id}
                  onSelect={() => handleSelect(() => router.push("/tasks"))}
                  className="flex items-center justify-between px-3 py-2 rounded-md text-xs text-zinc-300 hover:bg-zinc-900 hover:text-white cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                    <span className="truncate">{item.title}</span>
                  </div>
                  <span className="text-[10px] text-zinc-500 uppercase">{item.source.replace("_", " ")}</span>
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>

          {/* Footer Shortcuts Help */}
          <div className="px-4 py-2 bg-zinc-950 border-t border-zinc-800 flex items-center justify-between text-[11px] text-zinc-500">
            <div className="flex items-center gap-3">
              <span><kbd className="text-zinc-400">↑↓</kbd> to navigate</span>
              <span><kbd className="text-zinc-400">↵</kbd> to select</span>
              <span><kbd className="text-zinc-400">ESC</kbd> to close</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-emerald-400 font-mono">Chrono-Node (No-AI)</span>
            </div>
          </div>
        </Command>
      </div>
    </div>
  );
}
