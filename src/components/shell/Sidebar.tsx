"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Compass, 
  CheckSquare, 
  Calendar as CalendarIcon, 
  GraduationCap, 
  FolderKanban, 
  BarChart3, 
  Settings,
  RefreshCw,
  Clock
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
    { label: "Home", href: "/", icon: Compass },
    { 
      label: "Tasks", 
      href: "/tasks", 
      icon: CheckSquare,
      badge: tasksCount > 0 ? String(tasksCount) : undefined,
    },
    { label: "Calendar", href: "/calendar", icon: CalendarIcon },
    { 
      label: "Academics", 
      href: "/academics", 
      icon: GraduationCap,
      badge: examsCount > 0 ? String(examsCount) : undefined,
    },
    { label: "Projects", href: "/projects", icon: FolderKanban },
    { label: "Focus", href: "/focus", icon: Clock },
    { label: "Analytics", href: "/analytics", icon: BarChart3 },
  ];

  const systemNav = [
    { label: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <aside className="w-56 flex-shrink-0 bg-canvas-secondary border-r border-hairline flex flex-col justify-between h-screen select-none font-sans">
      {/* Brand Header */}
      <div>
        <div className="h-14 px-5 flex items-center justify-between border-b border-hairline">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-6 h-6 rounded-sm bg-ink text-surface flex items-center justify-center font-serif text-xs font-bold shadow-subtle">
              N
            </div>
            <div className="flex flex-col">
              <span className="font-serif font-bold text-sm tracking-wide text-ink">NEXUS</span>
              <span className="text-[9px] text-ink-muted uppercase tracking-widest -mt-1 font-mono">Personal OS</span>
            </div>
          </Link>
        </div>

        {/* Primary Navigation */}
        <nav className="p-3 space-y-0.5">
          <div className="px-2 pt-2 pb-1.5 text-[10px] font-medium text-ink-muted uppercase tracking-wider font-mono">
            Navigation
          </div>
          {mainNav.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 px-2.5 py-1.5 rounded-sm text-xs transition-colors group",
                  isActive
                    ? "bg-olive-soft text-olive-text font-medium shadow-none"
                    : "text-ink-secondary hover:text-ink hover:bg-[#E5E0D5]"
                )}
              >
                <Icon className={cn("w-3.5 h-3.5 shrink-0 transition-colors", isActive ? "text-olive" : "text-ink-muted group-hover:text-ink")} />
                <span className="flex-1 truncate">{item.label}</span>

                {item.badge && (
                  <span
                    className={cn(
                      "text-[10px] font-mono px-1.5 py-0.2 rounded font-normal",
                      isActive
                        ? "text-olive font-medium"
                        : "text-ink-muted group-hover:text-ink-secondary"
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}

          <div className="pt-4 pb-1">
            <div className="h-px bg-hairline-subtle mb-3 mx-2" />
            <div className="px-2 pb-1.5 text-[10px] font-medium text-ink-muted uppercase tracking-wider font-mono">
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
                    "flex items-center gap-2.5 px-2.5 py-1.5 rounded-sm text-xs transition-colors group",
                    isActive
                      ? "bg-olive-soft text-olive-text font-medium"
                      : "text-ink-secondary hover:text-ink hover:bg-[#E5E0D5]"
                  )}
                >
                  <Icon className={cn("w-3.5 h-3.5 shrink-0 transition-colors", isActive ? "text-olive" : "text-ink-muted group-hover:text-ink")} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>

      {/* Bottom Sync Health (Quiet & Clean) */}
      <div className="p-3 border-t border-hairline">
        <div className="px-2.5 py-2 rounded-sm bg-surface border border-hairline flex items-center justify-between text-xs">
          {needsReauth ? (
            <Link
              href="/settings"
              className="flex items-center gap-2 text-terracotta hover:underline transition-colors w-full"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-terracotta shrink-0" />
              <div className="flex flex-col flex-1 min-w-0">
                <span className="font-medium text-[11px] text-terracotta">Auth Expired</span>
                <span className="text-[10px] text-ink-muted truncate">Reconnect Google →</span>
              </div>
            </Link>
          ) : (
            <>
              <div className="flex items-center gap-2 min-w-0">
                <span className={cn(
                  "w-1.5 h-1.5 rounded-full shrink-0",
                  syncError ? "bg-terracotta" : "bg-olive"
                )} />
                <div className="flex flex-col min-w-0">
                  <span className="text-ink text-[11px] font-medium leading-none">
                    {syncError ? "Notice" : "Synced"}
                  </span>
                  <span className="text-ink-muted text-[10px] leading-tight mt-0.5 truncate font-mono" title={syncError || lastSyncedText}>
                    {syncError ? "Click to Retry" : lastSyncedText}
                  </span>
                </div>
              </div>

              <button
                onClick={() => syncAll()}
                disabled={isSyncing}
                title="Sync Now"
                className="p-1 rounded text-ink-muted hover:text-ink hover:bg-canvas-secondary transition-colors disabled:opacity-50 shrink-0 ml-1"
              >
                <RefreshCw className={cn("w-3 h-3", isSyncing && "animate-spin text-olive")} />
              </button>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
