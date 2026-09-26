"use client";

import { Search, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  onOpenCommand: () => void;
  onOpenBrainDump: () => void;
}

export function Header({ onOpenCommand, onOpenBrainDump }: HeaderProps) {
  return (
    <header className="h-14 border-b border-hairline bg-canvas/80 backdrop-blur-sm px-6 flex items-center justify-between sticky top-0 z-30 select-none">
      {/* Search / Command trigger */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={onOpenCommand}
          className="flex items-center gap-2.5 px-3 py-1.5 rounded-sm bg-surface border border-hairline text-ink-muted hover:text-ink hover:border-hairline-darker transition-all text-xs w-64 md:w-80 group shadow-subtle"
        >
          <Search className="w-3.5 h-3.5 text-ink-muted group-hover:text-ink transition-colors" />
          <span className="flex-1 text-left text-ink-secondary text-xs">Search or command...</span>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-canvas-secondary text-ink-muted border border-hairline-subtle rounded-[3px]">
            ⌘K
          </kbd>
        </button>

        {/* Quick Capture (Brain Dump) */}
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onOpenBrainDump}
          className="hidden sm:flex items-center gap-1.5 text-xs h-8 text-ink-secondary hover:text-ink"
        >
          <PenLine className="w-3 h-3 text-ink-muted" />
          <span>Capture</span>
        </Button>
      </div>

      {/* Right controls: Monogram / Session */}
      <div className="flex items-center gap-3">
        <div 
          title="NEXUS Workspace" 
          className="w-7 h-7 rounded-sm bg-surface border border-hairline text-ink font-serif text-xs font-bold flex items-center justify-center shadow-subtle select-none"
        >
          N
        </div>
      </div>
    </header>
  );
}
