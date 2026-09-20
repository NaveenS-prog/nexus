"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Compass, 
  CheckSquare, 
  Calendar as CalendarIcon, 
  GraduationCap, 
  Rocket, 
  BarChart3, 
  Target, 
  Settings, 
  RefreshCw
} from "lucide-react";
import { useNexusStore } from "@/lib/data/store";
import { cn } from "@/components/ui/badge";

export function Sidebar() {
  const pathname = usePathname();
  const { isSyncing, lastSyncedText, syncAll, mode } = useNexusStore();

  const mainNav = [
    { label: "Command Center", href: "/", icon: Compass },
    { label: "Tasks", href: "/tasks", icon: CheckSquare },
    { label: "Calendar", href: "/calendar", icon: CalendarIcon },
    { label: "Academics", href: "/academics", icon: GraduationCap },
    { label: "Projects", href: "/projects", icon: Rocket },
    { label: "Analytics", href: "/analytics", icon: BarChart3 },
  ];

  const focusNav = [
    { label: "Focus", href: "/focus", icon: Target },
    { label: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <aside className="w-60 flex-shrink-0 bg-white/75 backdrop-blur-xl border-r border-zinc-200/80 flex flex-col justify-between h-screen select-none shadow-[1px_0_10px_rgba(0,0,0,0.02)]">
      {/* Brand Header */}
      <div>
        <div className="h-14 px-5 flex items-center justify-between border-b border-zinc-200/80">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 rounded-lg bg-zinc-950 flex items-center justify-center text-white font-bold text-xs shadow-sm group-hover:scale-105 transition-transform">
              N
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-sm tracking-wider text-zinc-950 font-mono">NEXUS</span>
              <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-mono -mt-1">COMMAND</span>
            </div>
          </Link>

          {/* Mode Pill in Sidebar */}
          {mode !== "default" && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase font-semibold border border-zinc-200 bg-zinc-100 text-zinc-800">
              {mode}
            </span>
          )}
        </div>

        {/* Navigation Sections */}
        <nav className="p-3 space-y-1">
          <div className="px-2 py-1 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider font-mono">
            Command
          </div>
          {mainNav.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-all group",
                  isActive
                    ? "bg-zinc-950 text-white font-semibold shadow-sm"
                    : "text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100/80"
                )}
              >
                <Icon className={cn("w-4 h-4 transition-colors", isActive ? "text-white" : "text-zinc-400 group-hover:text-zinc-900")} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          <div className="pt-4 pb-1">
            <div className="h-px bg-zinc-200/80 mb-3" />
            <div className="px-2 py-1 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider font-mono">
              Productivity
            </div>
            {focusNav.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-all group",
                    isActive
                      ? "bg-zinc-950 text-white font-semibold shadow-sm"
                      : "text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100/80"
                  )}
                >
                  <Icon className={cn("w-4 h-4 transition-colors", isActive ? "text-white" : "text-zinc-400 group-hover:text-zinc-900")} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>

      {/* Bottom Sync & Health Status */}
      <div className="p-3 border-t border-zinc-200/80">
        <div className="px-3 py-2.5 rounded-lg bg-zinc-50 border border-zinc-200 flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-zinc-950 opacity-50"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-zinc-950"></span>
            </span>
            <div className="flex flex-col">
              <span className="text-zinc-900 font-medium leading-none">Connected</span>
              <span className="text-zinc-500 text-[10px] leading-tight mt-0.5">
                Sync: {lastSyncedText}
              </span>
            </div>
          </div>

          <button
            onClick={() => syncAll()}
            disabled={isSyncing}
            title="Manual Sync Now"
            className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-950 hover:bg-zinc-200/60 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isSyncing && "animate-spin text-zinc-900")} />
          </button>
        </div>
      </div>
    </aside>
  );
}
