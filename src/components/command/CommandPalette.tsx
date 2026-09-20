"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { 
  CheckSquare, 
  Lightbulb, 
  FileText, 
  Target, 
  Compass, 
  GraduationCap, 
  Rocket, 
  BarChart3, 
  Settings, 
  RefreshCw,
  Sparkles,
  BookOpen,
  Hammer
} from "lucide-react";
import { useNexusStore } from "@/lib/data/store";
import { DashboardMode } from "@/lib/types";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenBrainDump: () => void;
}

export function CommandPalette({ isOpen, onClose, onOpenBrainDump }: CommandPaletteProps) {
  const router = useRouter();
  const { items, projects, addItem, setMode, syncAll } = useNexusStore();
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!isOpen) setSearch("");
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelect = (action: () => void) => {
    action();
    onClose();
  };

  const handleCustomCommand = (input: string) => {
    const trimmed = input.trim();
    if (trimmed.startsWith("/task ")) {
      const taskTitle = trimmed.replace("/task ", "").trim();
      if (taskTitle) {
        addItem({
          source: "nexus",
          title: taskTitle,
          category: "personal",
          priority: "medium",
          status: "pending",
          dueAt: new Date(Date.now() + 86400000).toISOString(),
          estimatedMinutes: 30,
        });
        onClose();
      }
    } else if (trimmed.startsWith("/idea ")) {
      const ideaTitle = trimmed.replace("/idea ", "").trim();
      if (ideaTitle) {
        addItem({
          source: "nexus",
          title: ideaTitle,
          category: "idea",
          priority: "medium",
          status: "pending",
          tags: ["Idea"],
        });
        onClose();
      }
    } else if (trimmed.startsWith("/focus")) {
      router.push("/focus");
      onClose();
    } else if (trimmed.startsWith("/plan")) {
      router.push("/");
      onClose();
    } else if (trimmed.startsWith("/mode exam")) {
      setMode("exam");
      onClose();
    } else if (trimmed.startsWith("/mode build")) {
      setMode("build");
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div 
        className="fixed inset-0" 
        onClick={onClose} 
      />

      <div className="relative w-full max-w-xl bg-black border border-zinc-800 rounded-xl shadow-2xl overflow-hidden z-10">
        <Command 
          className="w-full bg-transparent"
          onKeyDown={(e) => {
            if (e.key === "Enter" && search.startsWith("/")) {
              handleCustomCommand(search);
            }
          }}
        >
          <div className="flex items-center px-4 border-b border-zinc-800">
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder="Type a command (/task, /idea, /focus) or search anything..."
              className="w-full bg-transparent py-3.5 text-sm text-zinc-100 placeholder-zinc-500 outline-none"
              autoFocus
            />
            <span className="text-[10px] font-mono text-zinc-400 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
              ESC
            </span>
          </div>

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
                onSelect={() => handleSelect(() => router.push("/focus"))}
                className="flex items-center gap-2.5 px-3 py-2 rounded-md text-xs text-zinc-300 hover:bg-zinc-900 hover:text-white cursor-pointer transition-colors"
              >
                <Target className="w-4 h-4 text-white" />
                <span className="font-medium">Start Focus Session</span>
                <span className="ml-auto text-[10px] text-zinc-500 font-mono">F</span>
              </Command.Item>

              <Command.Item
                onSelect={() => handleSelect(() => syncAll())}
                className="flex items-center gap-2.5 px-3 py-2 rounded-md text-xs text-zinc-300 hover:bg-zinc-900 hover:text-white cursor-pointer transition-colors"
              >
                <RefreshCw className="w-4 h-4 text-white" />
                <span className="font-medium">Sync All Integrations Now</span>
              </Command.Item>
            </Command.Group>

            {/* Mode Switchers */}
            <Command.Group heading="Work Modes">
              <Command.Item
                onSelect={() => handleSelect(() => setMode("exam"))}
                className="flex items-center gap-2.5 px-3 py-2 rounded-md text-xs text-zinc-300 hover:bg-zinc-900 hover:text-white cursor-pointer transition-colors"
              >
                <BookOpen className="w-4 h-4 text-white" />
                <span className="font-medium">Switch to Exam Mode</span>
                <span className="ml-auto text-[10px] text-zinc-500 font-mono">E</span>
              </Command.Item>

              <Command.Item
                onSelect={() => handleSelect(() => setMode("build"))}
                className="flex items-center gap-2.5 px-3 py-2 rounded-md text-xs text-zinc-300 hover:bg-zinc-900 hover:text-white cursor-pointer transition-colors"
              >
                <Hammer className="w-4 h-4 text-white" />
                <span className="font-medium">Switch to Build Mode</span>
                <span className="ml-auto text-[10px] text-zinc-500 font-mono">B</span>
              </Command.Item>

              <Command.Item
                onSelect={() => handleSelect(() => setMode("default"))}
                className="flex items-center gap-2.5 px-3 py-2 rounded-md text-xs text-zinc-300 hover:bg-zinc-900 hover:text-white cursor-pointer transition-colors"
              >
                <Compass className="w-4 h-4 text-zinc-400" />
                <span className="font-medium">Switch to Default Mode</span>
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
              <span>Mode: <kbd className="text-zinc-400 font-mono">E</kbd> / <kbd className="text-zinc-400 font-mono">B</kbd></span>
              <span>Focus: <kbd className="text-zinc-400 font-mono">F</kbd></span>
            </div>
          </div>
        </Command>
      </div>
    </div>
  );
}
