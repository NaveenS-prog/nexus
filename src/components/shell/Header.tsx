"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  Search, 
  Sun, 
  Moon, 
  Sparkles, 
  BookOpen, 
  Hammer
} from "lucide-react";
import { useNexusStore } from "@/lib/data/store";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/badge";

interface HeaderProps {
  onOpenCommand: () => void;
  onOpenBrainDump: () => void;
}

export function Header({ onOpenCommand, onOpenBrainDump }: HeaderProps) {
  const { mode, setMode } = useNexusStore();
  const [isLightMode, setIsLightMode] = useState(true);

  const toggleTheme = () => {
    setIsLightMode(!isLightMode);
    if (isLightMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  return (
    <header className="h-14 border-b border-zinc-200/80 bg-white/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30 select-none shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
      {/* Search / Command trigger */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenCommand}
          className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-zinc-50/90 border border-zinc-200 text-zinc-600 hover:text-zinc-950 hover:bg-white hover:border-zinc-300 transition-all text-xs w-64 md:w-80 group shadow-sm"
        >
          <Search className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-700" />
          <span className="flex-1 text-left font-medium">Search / Command...</span>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-white text-zinc-500 border border-zinc-200 rounded shadow-xs">
            Ctrl K
          </kbd>
        </button>

        {/* Quick Brain Dump Action */}
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onOpenBrainDump}
          className="hidden sm:flex items-center gap-1.5 text-xs h-8 border-zinc-200 text-zinc-900 bg-white hover:bg-zinc-50 hover:border-zinc-300 shadow-sm"
        >
          <Sparkles className="w-3.5 h-3.5 text-zinc-800" />
          <span>Capture</span>
        </Button>
      </div>

      {/* Center / Right controls: Mode Switcher, Theme, Avatar */}
      <div className="flex items-center gap-3">
        {/* Global Mode Switcher */}
        <div className="hidden md:flex items-center bg-zinc-100/90 border border-zinc-200/90 rounded-lg p-0.5 text-xs">
          <button
            onClick={() => setMode("default")}
            className={cn(
              "px-2.5 py-1 rounded text-xs font-medium transition-all",
              mode === "default"
                ? "bg-white text-zinc-950 font-semibold shadow-xs border border-zinc-200/60"
                : "text-zinc-600 hover:text-zinc-950"
            )}
          >
            Default
          </button>
          <button
            onClick={() => setMode("exam")}
            className={cn(
              "px-2.5 py-1 rounded text-xs font-medium transition-all flex items-center gap-1.5",
              mode === "exam"
                ? "bg-white text-zinc-950 font-semibold shadow-xs border border-zinc-200/60"
                : "text-zinc-600 hover:text-zinc-950"
            )}
          >
            <BookOpen className="w-3 h-3 text-zinc-800" />
            <span>Exam Mode</span>
          </button>
          <button
            onClick={() => setMode("build")}
            className={cn(
              "px-2.5 py-1 rounded text-xs font-medium transition-all flex items-center gap-1.5",
              mode === "build"
                ? "bg-white text-zinc-950 font-semibold shadow-xs border border-zinc-200/60"
                : "text-zinc-600 hover:text-zinc-950"
            )}
          >
            <Hammer className="w-3 h-3 text-zinc-800" />
            <span>Build Mode</span>
          </button>
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          title="Toggle Theme"
          className="p-2 rounded-lg bg-white border border-zinc-200 text-zinc-700 hover:text-zinc-950 hover:border-zinc-300 hover:bg-zinc-50 shadow-xs transition-colors"
        >
          {isLightMode ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
        </button>

        {/* Demo Badge */}
        <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-mono rounded-md border border-zinc-200 bg-zinc-50 text-zinc-700">
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-900" />
          Demo Mode
        </span>

        {/* User Avatar */}
        <div className="w-8 h-8 rounded-full bg-zinc-950 text-white font-bold flex items-center justify-center text-xs shadow-sm border border-zinc-800">
          N
        </div>
      </div>
    </header>
  );
}
