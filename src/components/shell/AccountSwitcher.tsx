"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Check, 
  ChevronDown, 
  Layers, 
  User, 
  GraduationCap, 
  Briefcase, 
  Plus, 
  AlertCircle,
  ExternalLink
} from "lucide-react";
import { useNexusStore } from "@/lib/data/store";
import { GlobalAccountFilter, AccountType } from "@/lib/types";

export function AccountSwitcher() {
  const router = useRouter();
  const { connectedAccounts, selectedAccountFilter, setAccountFilter, items } = useNexusStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Determine current active filter label and icon styling
  const getActiveFilterMeta = () => {
    if (selectedAccountFilter === "all") {
      return {
        label: "All Accounts",
        badge: "Unified",
        color: "bg-ink-muted/20 text-ink-secondary",
        icon: Layers,
      };
    }

    if (selectedAccountFilter === "personal") {
      return {
        label: "Personal",
        badge: "Life",
        color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
        icon: User,
      };
    }

    if (selectedAccountFilter === "university") {
      return {
        label: "University",
        badge: "Academic",
        color: "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30",
        icon: GraduationCap,
      };
    }

    if (selectedAccountFilter === "work") {
      return {
        label: "Work",
        badge: "Work",
        color: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
        icon: Briefcase,
      };
    }

    const matched = connectedAccounts.find((a) => a.id === selectedAccountFilter);
    if (matched) {
      const isUni = matched.accountType === "university";
      return {
        label: matched.displayName || matched.email.split("@")[0],
        badge: matched.accountType.toUpperCase(),
        color: isUni 
          ? "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30" 
          : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
        icon: isUni ? GraduationCap : User,
      };
    }

    return {
      label: "Account Filter",
      badge: "",
      color: "bg-ink-muted/20 text-ink-secondary",
      icon: Layers,
    };
  };

  const meta = getActiveFilterMeta();
  const IconComponent = meta.icon;

  const handleSelectFilter = (filter: GlobalAccountFilter) => {
    setAccountFilter(filter);
    setIsOpen(false);
  };

  const personalAccounts = connectedAccounts.filter((a) => a.accountType === "personal");
  const universityAccounts = connectedAccounts.filter((a) => a.accountType === "university");
  const otherAccounts = connectedAccounts.filter((a) => a.accountType !== "personal" && a.accountType !== "university");

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Switcher Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-sm bg-surface border border-hairline hover:border-hairline-darker text-ink transition-all text-xs shadow-subtle group"
      >
        <span className={`w-2 h-2 rounded-full ${
          selectedAccountFilter === "personal" 
            ? "bg-emerald-500" 
            : selectedAccountFilter === "university" 
            ? "bg-purple-500" 
            : selectedAccountFilter === "all" 
            ? "bg-ink-muted" 
            : "bg-blue-500"
        }`} />

        <span className="font-medium text-xs text-ink max-w-[120px] truncate">
          {meta.label}
        </span>

        {meta.badge && selectedAccountFilter !== "all" && (
          <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-canvas-secondary text-ink-muted border border-hairline uppercase">
            {meta.badge}
          </span>
        )}

        <ChevronDown className="w-3 h-3 text-ink-muted group-hover:text-ink transition-colors ml-0.5" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-64 bg-surface border border-hairline rounded-lg shadow-xl py-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-1.5 text-[10px] font-mono text-ink-muted uppercase tracking-wider border-b border-hairline">
            Account Workspace Filter
          </div>

          {/* Unified View */}
          <button
            onClick={() => handleSelectFilter("all")}
            className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-canvas-secondary/70 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-ink-muted" />
              <div>
                <p className="font-medium text-ink">All Accounts</p>
                <p className="text-[10px] text-ink-muted">Unified life & academic feed</p>
              </div>
            </div>
            {selectedAccountFilter === "all" && <Check className="w-3.5 h-3.5 text-olive" />}
          </button>

          <div className="my-1 border-t border-hairline" />

          {/* Connected Accounts Section */}
          {connectedAccounts.length > 0 ? (
            <div className="max-h-60 overflow-y-auto py-0.5">
              {/* Personal Accounts */}
              {personalAccounts.map((acc) => {
                const isSelected = selectedAccountFilter === acc.id || selectedAccountFilter === "personal";
                const isReauth = acc.status === "reauth_required";
                return (
                  <button
                    key={acc.id}
                    onClick={() => handleSelectFilter(acc.id)}
                    className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-canvas-secondary/70 transition-colors group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-500/20">
                        <User className="w-2.5 h-2.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-medium text-ink truncate">{acc.displayName || "Personal Account"}</p>
                          <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                            PERSONAL
                          </span>
                        </div>
                        <p className="text-[10px] text-ink-muted truncate">{acc.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      {isReauth && (
                        <span title="Re-auth required">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                        </span>
                      )}
                      {isSelected && <Check className="w-3.5 h-3.5 text-olive" />}
                    </div>
                  </button>
                );
              })}

              {/* University Accounts */}
              {universityAccounts.map((acc) => {
                const isSelected = selectedAccountFilter === acc.id || selectedAccountFilter === "university";
                const isReauth = acc.status === "reauth_required";
                return (
                  <button
                    key={acc.id}
                    onClick={() => handleSelectFilter(acc.id)}
                    className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-canvas-secondary/70 transition-colors group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-5 h-5 rounded-full bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0 border border-purple-500/20">
                        <GraduationCap className="w-2.5 h-2.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-medium text-ink truncate">{acc.displayName || "University Account"}</p>
                          <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-purple-500/10 text-purple-700 dark:text-purple-400">
                            ACADEMIC
                          </span>
                        </div>
                        <p className="text-[10px] text-ink-muted truncate">{acc.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      {isReauth && (
                        <span title="Re-auth required">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                        </span>
                      )}
                      {isSelected && <Check className="w-3.5 h-3.5 text-olive" />}
                    </div>
                  </button>
                );
              })}

              {/* Other Accounts */}
              {otherAccounts.map((acc) => {
                const isSelected = selectedAccountFilter === acc.id;
                return (
                  <button
                    key={acc.id}
                    onClick={() => handleSelectFilter(acc.id)}
                    className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-canvas-secondary/70 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-5 h-5 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0 border border-blue-500/20">
                        <Briefcase className="w-2.5 h-2.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-ink truncate">{acc.displayName || acc.email}</p>
                        <p className="text-[10px] text-ink-muted truncate">{acc.email}</p>
                      </div>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-olive shrink-0 ml-2" />}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="px-3 py-2 text-center text-ink-muted">
              <p className="text-[11px]">No Google accounts connected yet</p>
            </div>
          )}

          <div className="my-1 border-t border-hairline" />

          {/* Quick Add / Manage Accounts */}
          <button
            onClick={() => {
              setIsOpen(false);
              router.push("/settings?tab=accounts");
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-left text-ink hover:text-olive hover:bg-canvas-secondary/70 transition-colors font-medium text-[11px]"
          >
            <Plus className="w-3.5 h-3.5 text-olive" />
            <span>Manage & Connect Accounts...</span>
          </button>
        </div>
      )}
    </div>
  );
}
