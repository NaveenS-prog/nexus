"use client";

import { 
  CheckCircle2, 
  Circle, 
  ExternalLink, 
  Trash2, 
  Calendar, 
  Clock, 
  Tag, 
  Folder,
  Sparkles
} from "lucide-react";
import { SlideOver } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UnifiedItem } from "@/lib/types";
import { smartTriageItem, getDomainBadgeProps } from "@/lib/nlp/itemClassifier";
import { format, parseISO } from "date-fns";

interface ItemDetailDrawerProps {
  item: UnifiedItem | null;
  isOpen: boolean;
  onClose: () => void;
  onToggleStatus: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ItemDetailDrawer({
  item,
  isOpen,
  onClose,
  onToggleStatus,
  onDelete,
}: ItemDetailDrawerProps) {
  if (!item) return null;

  const isCompleted = item.status === "completed";
  const isCalendar = item.category === "calendar";

  return (
    <SlideOver
      isOpen={isOpen}
      onClose={onClose}
      title={item.title}
      subtitle={`Source: ${item.source.replace("_", " ").toUpperCase()}`}
    >
      <div className="space-y-6">
        {/* Top Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={item.priority === "critical" ? "destructive" : item.priority === "high" ? "warning" : "secondary"}>
            {item.priority.toUpperCase()} PRIORITY
          </Badge>
          <Badge variant="outline" className="capitalize">
            {item.category}
          </Badge>
          <Badge variant={isCompleted ? "success" : "cyan"}>
            {isCompleted ? "Completed" : item.status === "in_progress" ? "In Progress" : "Pending"}
          </Badge>
        </div>

        {/* Autonomous AI Smart Triage Analysis */}
        {(() => {
          const triage = smartTriageItem({
            title: item.title,
            description: item.description,
            source: item.source,
            category: item.category,
            dueAt: item.dueAt,
            startAt: item.startAt,
            location: item.metadata?.location,
          });
          const badgeProps = getDomainBadgeProps(triage.domain);

          return (
            <div className="p-3.5 rounded-xl border border-hairline bg-canvas-secondary/50 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-olive font-bold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-olive" />
                  NEXUS Smart Triage
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface text-ink-secondary border border-hairline">
                  {Math.round(triage.confidence * 100)}% Confidence
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-bold uppercase ${badgeProps.bgClass} ${badgeProps.colorClass} ${badgeProps.borderClass}`}>
                  {badgeProps.label}
                </span>
                <span className="text-[11px] text-ink-muted truncate">
                  {triage.reason}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-surface border border-hairline text-xs text-ink-secondary flex items-start gap-2">
                <span className="text-ink-muted font-mono text-[10px] shrink-0 mt-0.5">SUGGESTED ACTION:</span>
                <span className="text-ink font-medium">{triage.suggestedAction}</span>
              </div>
            </div>
          );
        })()}

        {/* Description */}
        {item.description && (
          <div className="space-y-1.5">
            <span className="text-[11px] font-mono uppercase text-ink-muted font-semibold">Description</span>
            <div className="p-3 rounded-lg bg-canvas border border-hairline text-xs text-ink-secondary leading-relaxed">
              {item.description}
            </div>
          </div>
        )}

        {/* Metadata Details Grid */}
        <div className="space-y-3">
          <span className="text-[11px] font-mono uppercase text-ink-muted font-semibold">Details</span>
          <div className="grid grid-cols-2 gap-3 text-xs">
            {item.startAt && (
              <div className="p-2.5 rounded-lg bg-surface border border-hairline">
                <div className="flex items-center gap-1.5 text-ink-muted text-[10px] font-mono uppercase">
                  <Calendar className="w-3 h-3 text-olive" />
                  <span>{item.metadata?.isAllDay || item.startAt.includes("T00:00:00") ? "Event Date" : "Start Time"}</span>
                </div>
                <span className="font-mono text-ink mt-1 block">
                  {item.metadata?.isAllDay || item.startAt.includes("T00:00:00")
                    ? `${format(parseISO(item.startAt), "EEE, MMM d, yyyy")} (All Day)`
                    : format(parseISO(item.startAt), "EEE, MMM d · h:mm a")}
                </span>
              </div>
            )}

            {item.dueAt && !item.metadata?.isAllDay && !item.dueAt.includes("T23:59:59") && !item.startAt?.includes("T00:00:00") && (
              <div className="p-2.5 rounded-lg bg-surface border border-hairline">
                <div className="flex items-center gap-1.5 text-ink-muted text-[10px] font-mono uppercase">
                  <Calendar className="w-3 h-3 text-olive" />
                  <span>{item.startAt ? "End Time" : "Due Date"}</span>
                </div>
                <span className="font-mono text-ink mt-1 block">
                  {format(parseISO(item.dueAt), "EEE, MMM d · h:mm a")}
                </span>
              </div>
            )}

            {item.estimatedMinutes && (
              <div className="p-2.5 rounded-lg bg-surface border border-hairline">
                <div className="flex items-center gap-1.5 text-ink-muted text-[10px] font-mono uppercase">
                  <Clock className="w-3 h-3 text-olive" />
                  <span>Estimated Effort</span>
                </div>
                <span className="font-mono text-ink mt-1 block">
                  {item.estimatedMinutes} minutes
                </span>
              </div>
            )}

            {item.courseName && (
              <div className="col-span-2 p-2.5 rounded-lg bg-surface border border-hairline">
                <div className="flex items-center gap-1.5 text-ink-muted text-[10px] font-mono uppercase">
                  <Folder className="w-3 h-3 text-olive" />
                  <span>Course</span>
                </div>
                <span className="text-ink mt-1 block font-medium">
                  {item.courseName}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Tags */}
        {item.tags && item.tags.length > 0 && (
          <div className="space-y-2">
            <span className="text-[11px] font-mono uppercase text-ink-muted font-semibold">Tags</span>
            <div className="flex flex-wrap gap-1.5">
              {item.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded bg-canvas-secondary text-[11px] font-mono text-ink-secondary border border-hairline"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* External Link */}
        {item.url && (
          <div className="pt-2">
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-xs text-olive hover:text-olive-hover underline font-medium"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open in upstream {item.source.replace("_", " ")}</span>
            </a>
          </div>
        )}

        {/* Action Controls */}
        <div className="pt-6 border-t border-hairline space-y-2">
          {!isCalendar && (
            <Button
              onClick={() => {
                onToggleStatus(item.id);
                onClose();
              }}
              variant="secondary"
              className="w-full flex items-center justify-center gap-2 text-xs"
            >
              {isCompleted ? (
                <>
                  <Circle className="w-4 h-4 text-ink-muted" />
                  <span>Mark Incomplete</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-olive" />
                  <span>Mark Completed</span>
                </>
              )}
            </Button>
          )}

          <Button
            variant="outline"
            onClick={() => {
              onDelete(item.id);
              onClose();
            }}
            className="w-full flex items-center justify-center gap-2 text-xs text-ink-muted hover:text-terracotta hover:bg-canvas-secondary border-hairline"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Item</span>
          </Button>
        </div>
      </div>
    </SlideOver>
  );
}
