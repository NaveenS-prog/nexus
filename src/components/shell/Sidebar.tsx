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
  Settings,
  RefreshCw 
} from "lucide-react";
import { useNexusStore } from "@/lib/data/store";
import { cn } from "@/components/ui/badge";
import { useMemo } from "react";
import { isExamItem, isActionableTaskOrAssignment } from "@/lib/nlp/itemClassifier";

export function Sidebar() {
  const pathname = usePathname();
  const { isSyncing, lastSyncedText, syncAll, items, syncError, needsReauth } = useNexusStore();

  const examsCount = useMemo(() => {
    return items.filter((i) => isExamItem(i) && i.status !== "completed").length;
  }, [items]);

  const tasksCount = useMemo(() => {
    return items.filter((i) => isActionableTaskOrAssignment(i) && i.status !== "completed").length;
  }, [items]);

  const mainNav = [
    { label: "Command Center", href: "/", icon: Compass },
    { 
      label: "Tasks", 
      href: "/tasks", 
      icon: CheckSquare,
      badge: tasksCount > 0 ? String(tasksCount) : undefined,
      badgeType: "neutral" as const,
    },
    { label: "Calendar", href: "/calendar", icon: CalendarIcon },
    { 
      label: "Academics", 
      href: "/academics", 
      icon: GraduationCap,
      badge: examsCount > 0 ? `${examsCount} exams` : undefined,
      badgeType: "exam" as const,
    },
    { label: "Projects", href: "/projects", icon: Rocket },
    { label: "Analytics", href: "/analytics", icon: BarChart3 },
  ];

  const systemNav = [
    { label: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <aside className="w-60 flex-shrink-0 bg-black border-r border-zinc-800 flex flex-col justify-between h-screen select-none">
      {/* Brand Header */}
      <div>
        <div className="h-14 px-5 flex items-center justify-between border-b border-zinc-800">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center text-black font-bold text-xs shadow-md group-hover:scale-105 transition-transform">
              N
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-sm tracking-wider text-white font-mono">NEXUS</span>
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono -mt-1">COMMAND</span>
            </div>
          </Link>
        </div>

        {/* Navigation Sections */}
        <nav className="p-3 space-y-1">
          <div className="px-2 py-1 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider font-mono">
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
                    ? "bg-white text-black border border-white font-semibold shadow-sm"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-900/60"
                )}
              >
                <Icon className={cn("w-4 h-4 transition-colors", isActive ? "text-black" : "text-zinc-400 group-hover:text-white")} />
                <span>{item.label}</span>

                {item.badge && (
                  <span
                    className={cn(
                      "ml-auto text-[9px] font-mono px-1.5 py-0.5 rounded-full font-bold",
                      item.badgeType === "exam"
                        ? isActive
                          ? "bg-rose-900 text-rose-100"
                          : "bg-rose-950 text-rose-300 border border-rose-800/80"
                        : isActive
                        ? "bg-black text-white"
                        : "bg-zinc-800 text-zinc-400"
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}

          <div className="pt-4 pb-1">
            <div className="h-px bg-zinc-800 mb-3" />
            <div className="px-2 py-1 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider font-mono">
              System
            </div>
            {systemNav.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-all group",
                    isActive
                      ? "bg-white text-black border border-white font-semibold shadow-sm"
                      : "text-zinc-400 hover:text-white hover:bg-zinc-900/60"
                  )}
                >
                  <Icon className={cn("w-4 h-4 transition-colors", isActive ? "text-black" : "text-zinc-400 group-hover:text-white")} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>

      {/* Bottom Sync & Health Status */}
      <div className="p-3 border-t border-zinc-800">
        <div className="px-3 py-2.5 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-between text-[11px]">
          {needsReauth ? (
            <Link
              href="/settings"
              className="flex items-center gap-2 group text-amber-300 hover:text-amber-200 transition-colors w-full"
              title="Google authorization token expired. Click to reconnect in Settings."
            >
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400"></span>
              </span>
              <div className="flex flex-col flex-1 min-w-0">
                <span className="font-semibold leading-none text-amber-300 text-[11px]">Auth Expired</span>
                <span className="text-zinc-400 text-[10px] leading-tight mt-0.5 truncate group-hover:underline">
                  Reconnect Google →
                </span>
              </div>
            </Link>
          ) : (
            <>
              <div className="flex items-center gap-2 min-w-0">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className={cn(
                    "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                    syncError ? "bg-rose-400" : "bg-emerald-400"
                  )}></span>
                  <span className={cn(
                    "relative inline-flex rounded-full h-2 w-2",
                    syncError ? "bg-rose-400" : "bg-emerald-400"
                  )}></span>
                </span>
                <div className="flex flex-col min-w-0">
                  <span className="text-zinc-200 font-medium leading-none">
                    {syncError ? "Sync Notice" : "Connected"}
                  </span>
                  <span className="text-zinc-400 text-[10px] leading-tight mt-0.5 truncate" title={syncError || lastSyncedText}>
                    {syncError ? "Click to Retry" : `Sync: ${lastSyncedText}`}
                  </span>
                </div>
              </div>

              <button
                onClick={() => syncAll()}
                disabled={isSyncing}
                title="Manual Sync Now"
                className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors disabled:opacity-50 shrink-0 ml-1"
              >
                <RefreshCw className={cn("w-3.5 h-3.5", isSyncing && "animate-spin text-white")} />
              </button>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
