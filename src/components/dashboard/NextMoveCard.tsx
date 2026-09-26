"use client";

import { useState } from "react";
import { Clock, RefreshCw, ArrowRight, Play } from "lucide-react";
import { RecommendationResult, UnifiedItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface NextMoveCardProps {
  recommendation: RecommendationResult | null;
  onRefresh: () => void;
  onSelectTask: (item: UnifiedItem) => void;
}

export function NextMoveCard({ recommendation, onRefresh, onSelectTask }: NextMoveCardProps) {
  const [dismissed, setDismissed] = useState(false);

  if (!recommendation || dismissed) {
    return (
      <div className="rounded-md border border-hairline bg-surface p-5 flex items-center justify-between shadow-subtle">
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-olive" />
          <span className="text-xs text-ink-secondary">Recommendation paused · Schedule clear</span>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => {
            setDismissed(false);
            onRefresh();
          }}
          className="text-xs h-7"
        >
          <RefreshCw className="w-3 h-3 mr-1.5" />
          <span>What should I do now?</span>
        </Button>
      </div>
    );
  }

  const { item, reason, availableMinutes } = recommendation;
  const deadlineText = item.dueAt ? `Due ${new Date(item.dueAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : undefined;

  return (
    <div className="rounded-md border border-hairline bg-surface p-6 space-y-4 shadow-subtle relative overflow-hidden">
      {/* Top Label */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase font-mono tracking-widest text-ink-muted">
          What should I do now?
        </span>
        <div className="flex items-center gap-2 text-xs text-ink-muted font-mono">
          <Clock className="w-3 h-3 text-ink-muted" />
          <span>~{item.estimatedMinutes || 45} min estimated</span>
        </div>
      </div>

      {/* Main Focus Title */}
      <div>
        <h2 className="font-editorial text-2xl font-normal text-ink leading-snug tracking-tight">
          {item.title}
        </h2>
        {reason && (
          <p className="text-xs text-ink-secondary leading-relaxed mt-2 max-w-xl">
            {reason}
          </p>
        )}
      </div>

      {/* Bottom Metadata & Intent Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-hairline-subtle">
        <div className="text-[11px] text-ink-muted font-mono flex items-center gap-2">
          {deadlineText && <span>{deadlineText}</span>}
          {deadlineText && <span>·</span>}
          <span>Free window: ~{availableMinutes || 90}m</span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDismissed(true)}
            className="text-xs text-ink-muted hover:text-ink"
          >
            Later
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onSelectTask(item)}
            className="text-xs"
          >
            <span>Details</span>
          </Button>

          <Link href="/focus">
            <Button
              variant="olive"
              size="sm"
              className="flex items-center gap-1.5"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Start Focus</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
