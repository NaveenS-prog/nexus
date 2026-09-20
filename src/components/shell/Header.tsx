"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  Search, 
  Volume2, 
  VolumeX, 
  Sun, 
  Moon, 
  Sparkles, 
  BookOpen, 
  Hammer, 
  SlidersHorizontal,
  Plus
} from "lucide-react";
import { useNexusStore } from "@/lib/data/store";
import { audioSynth } from "@/lib/audio/webAudioSynth";
import { Button } from "@/components/ui/button";
import { Badge, cn } from "@/components/ui/badge";

interface HeaderProps {
  onOpenCommand: () => void;
  onOpenBrainDump: () => void;
}

export function Header({ onOpenCommand, onOpenBrainDump }: HeaderProps) {
  const { mode, setMode } = useNexusStore();
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isLightMode, setIsLightMode] = useState(false);

  const toggleAmbientSound = () => {
    if (isPlayingAudio) {
      audioSynth.stop();
      setIsPlayingAudio(false);
    } else {
      audioSynth.play("rain");
      setIsPlayingAudio(true);
    }
  };

  const toggleTheme = () => {
    setIsLightMode(!isLightMode);
    if (!isLightMode) {
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
    }
  };

  return (
    <header className="h-14 border-b border-white/[0.08] bg-nexus-950/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30 select-none">
      {/* Search / Command trigger */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenCommand}
          className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-nexus-900 border border-white/[0.08] text-zinc-400 hover:text-zinc-200 hover:border-white/[0.16] transition-all text-xs w-64 md:w-80 group shadow-inner"
        >
          <Search className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300" />
          <span className="flex-1 text-left">Search / Command...</span>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-white/[0.06] text-zinc-400 border border-white/[0.1] rounded">
            Ctrl K
          </kbd>
        </button>

        {/* Quick Brain Dump Action */}
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onOpenBrainDump}
          className="hidden sm:flex items-center gap-1.5 text-xs h-8 border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/10"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>Capture</span>
        </Button>
      </div>

      {/* Center / Right controls: Mode Switcher, Audio, Theme, Avatar */}
      <div className="flex items-center gap-3">
        {/* Global Mode Switcher */}
        <div className="hidden md:flex items-center bg-nexus-900 border border-white/[0.08] rounded-lg p-0.5 text-xs">
          <button
            onClick={() => setMode("default")}
            className={cn(
              "px-2.5 py-1 rounded text-xs font-medium transition-all",
              mode === "default"
                ? "bg-white/[0.1] text-zinc-100 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            )}
          >
            Default
          </button>
          <button
            onClick={() => setMode("exam")}
            className={cn(
              "px-2.5 py-1 rounded text-xs font-medium transition-all flex items-center gap-1.5",
              mode === "exam"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            )}
          >
            <BookOpen className="w-3 h-3" />
            <span>Exam Mode</span>
          </button>
          <button
            onClick={() => setMode("build")}
            className={cn(
              "px-2.5 py-1 rounded text-xs font-medium transition-all flex items-center gap-1.5",
              mode === "build"
                ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            )}
          >
            <Hammer className="w-3 h-3" />
            <span>Build Mode</span>
          </button>
        </div>

        {/* Focus Audio Toggle */}
        <button
          onClick={toggleAmbientSound}
          title={isPlayingAudio ? "Pause Ambient Rain" : "Play Ambient Rain"}
          className={cn(
            "p-2 rounded-lg border text-xs font-medium transition-colors flex items-center gap-1.5",
            isPlayingAudio
              ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300 shadow-sm shadow-indigo-500/20"
              : "bg-nexus-900 border-white/[0.08] text-zinc-400 hover:text-zinc-200 hover:border-white/[0.16]"
          )}
        >
          {isPlayingAudio ? (
            <>
              <Volume2 className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
              <span className="hidden lg:inline text-[11px]">Rain Active</span>
            </>
          ) : (
            <>
              <VolumeX className="w-3.5 h-3.5 text-zinc-500" />
              <span className="hidden lg:inline text-[11px]">Focus Sound</span>
            </>
          )}
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          title="Toggle Light/Dark Theme"
          className="p-2 rounded-lg bg-nexus-900 border border-white/[0.08] text-zinc-400 hover:text-zinc-200 hover:border-white/[0.16] transition-colors"
        >
          {isLightMode ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
        </button>

        {/* Demo Badge */}
        <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-mono rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          Demo Mode
        </span>

        {/* User Avatar */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-md border border-white/20">
          N
        </div>
      </div>
    </header>
  );
}
