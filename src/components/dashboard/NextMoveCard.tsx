"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Zap, Play, Clock, Sparkles, RefreshCw } from "lucide-react";
import { RecommendationResult, UnifiedItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface NextMoveCardProps {
  recommendation: RecommendationResult | null;
  onRefresh: () => void;
  onSelectTask: (item: UnifiedItem) => void;
}

export function NextMoveCard({ recommendation, onRefresh, onSelectTask }: NextMoveCardProps) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);

  if (!recommendation || dismissed) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white/80 backdrop-blur-md p-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2.5">
          <Zap className="w-4 h-4 text-zinc-900" />
          <span className="text-xs text-zinc-600">Recommendation paused or queue clear</span>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => {
            setDismissed(false);
            onRefresh();
          }}
          className="text-xs h-7 border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50"
        >
          <RefreshCw className="w-3 h-3 mr-1.5" />
          What should I do now?
        </Button>
      </div>
    );
  }

  const { item, reason, availableMinutes } = recommendation;

  return (
    <div className="rounded-xl border border-zinc-200/90 bg-white/90 backdrop-blur-md p-5 space-y-4 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.03)]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-zinc-950 text-white shadow-xs">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 font-bold">
              YOUR NEXT MOVE
            </span>
            <h3 className="text-base font-bold text-zinc-950 mt-0.5">
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
      <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200/80 text-xs space-y-1">
        <div className="flex items-center gap-1.5 text-zinc-600 font-mono text-[10px] uppercase">
          <Sparkles className="w-3 h-3 text-zinc-900" />
          <span>Why this task now:</span>
        </div>
        <p className="text-zinc-700 leading-relaxed font-normal">
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
            className="text-xs text-zinc-500 hover:text-zinc-950"
          >
            Not Now
          </Button>

          <Button
            size="sm"
            onClick={() => {
              router.push("/focus");
            }}
            className="flex items-center gap-1.5 text-xs h-8 bg-zinc-950 text-white font-semibold hover:bg-zinc-800 shadow-sm"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Start Focus</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
