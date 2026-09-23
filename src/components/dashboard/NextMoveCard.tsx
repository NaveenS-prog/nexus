"use client";

import { useState } from "react";
import { Zap, CheckCircle, Clock, Sparkles, RefreshCw, ArrowRight } from "lucide-react";
import { RecommendationResult, UnifiedItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface NextMoveCardProps {
  recommendation: RecommendationResult | null;
  onRefresh: () => void;
  onSelectTask: (item: UnifiedItem) => void;
}

export function NextMoveCard({ recommendation, onRefresh, onSelectTask }: NextMoveCardProps) {
  const [dismissed, setDismissed] = useState(false);

  if (!recommendation || dismissed) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Zap className="w-4 h-4 text-white" />
          <span className="text-xs text-zinc-400">Recommendation paused or queue clear</span>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => {
            setDismissed(false);
            onRefresh();
          }}
          className="text-xs h-7 border-zinc-700 hover:border-white"
        >
          <RefreshCw className="w-3 h-3 mr-1.5" />
          What should I do now?
        </Button>
      </div>
    );
  }

  const { item, reason, availableMinutes } = recommendation;

  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-950 p-5 space-y-4 shadow-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-white text-black border border-white">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 font-bold">
              YOUR NEXT MOVE
            </span>
            <h3 className="text-base font-bold text-zinc-100 mt-0.5">
              {item.title}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {item.priority === "critical" && <Badge variant="destructive">Critical Priority</Badge>}
          {item.priority === "high" && <Badge variant="warning">High Priority</Badge>}
          <Badge variant="secondary">{item.estimatedMinutes || 45} mins</Badge>
        </div>
      </div>

      {/* Rationale Callout */}
      <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-xs space-y-1">
        <div className="flex items-center gap-1.5 text-zinc-400 font-mono text-[10px] uppercase">
          <Sparkles className="w-3 h-3 text-white" />
          <span>Why this task now:</span>
        </div>
        <p className="text-zinc-300 leading-relaxed">
          {reason}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2 text-[11px] text-zinc-500">
          <Clock className="w-3.5 h-3.5 text-zinc-400" />
          <span>Available window: ~{availableMinutes || 90}m</span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDismissed(true)}
            className="text-xs text-zinc-400 hover:text-white"
          >
            Not Now
          </Button>

          <Button
            size="sm"
            onClick={() => onSelectTask(item)}
            className="flex items-center gap-1.5 text-xs h-8 bg-white text-black font-semibold hover:bg-zinc-200"
          >
            <span>View Task</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
