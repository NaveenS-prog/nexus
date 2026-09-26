"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { CommandPalette } from "@/components/command/CommandPalette";
import { BrainDumpModal } from "@/components/command/BrainDumpModal";
import { useNexusStore } from "@/lib/data/store";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [commandOpen, setCommandOpen] = useState(false);
  const [brainDumpOpen, setBrainDumpOpen] = useState(false);
  const { syncAll } = useNexusStore();

  // 1. Autonomous Real-Time Background Synchronization
  useEffect(() => {
    // Immediate background sync on load (debounced 500ms)
    const initTimer = setTimeout(() => {
      syncAll();
    }, 500);

    // Sync whenever user switches back to this browser window / tab
    const handleFocus = () => {
      syncAll();
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        syncAll();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);

    // Periodic live sync every 45 seconds so newly created calendar events stream in automatically
    const interval = setInterval(() => {
      syncAll();
    }, 45000);

    return () => {
      clearTimeout(initTimer);
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [syncAll]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input or textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      // Ctrl + K or Cmd + K
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-black text-foreground font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Header 
          onOpenCommand={() => setCommandOpen(true)} 
          onOpenBrainDump={() => setBrainDumpOpen(true)} 
        />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Global Modals */}
      <CommandPalette 
        isOpen={commandOpen} 
        onClose={() => setCommandOpen(false)} 
        onOpenBrainDump={() => {
          setCommandOpen(false);
          setBrainDumpOpen(true);
        }}
      />
      <BrainDumpModal 
        isOpen={brainDumpOpen} 
        onClose={() => setBrainDumpOpen(false)} 
      />
    </div>
  );
}
