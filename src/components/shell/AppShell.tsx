"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { CommandPalette } from "@/components/command/CommandPalette";
import { BrainDumpModal } from "@/components/command/BrainDumpModal";
import { useNexusStore } from "@/lib/data/store";

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { setMode } = useNexusStore();
  const [commandOpen, setCommandOpen] = useState(false);
  const [brainDumpOpen, setBrainDumpOpen] = useState(false);

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

      // Quick hotkeys
      if (e.key.toLowerCase() === "e" && !e.ctrlKey && !e.metaKey) {
        setMode("exam");
      } else if (e.key.toLowerCase() === "b" && !e.ctrlKey && !e.metaKey) {
        setMode("build");
      } else if (e.key.toLowerCase() === "f" && !e.ctrlKey && !e.metaKey) {
        router.push("/focus");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router, setMode]);

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
