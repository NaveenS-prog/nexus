"use client";

import { useRouter } from "next/navigation";
import { 
  CheckCircle2, 
  Circle, 
  ExternalLink, 
  Trash2, 
  Play, 
  Calendar, 
  Clock, 
  Tag, 
  Folder 
} from "lucide-react";
import { SlideOver } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UnifiedItem } from "@/lib/types";

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
  const router = useRouter();
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

        {/* Description */}
        {item.description && (
          <div className="space-y-1.5">
            <span className="text-[11px] font-mono uppercase text-zinc-500 font-semibold">Description</span>
            <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 leading-relaxed">
              {item.description}
            </div>
          </div>
        )}

        {/* Metadata Details Grid */}
        <div className="space-y-3">
          <span className="text-[11px] font-mono uppercase text-zinc-500 font-semibold">Details</span>
          <div className="grid grid-cols-2 gap-3 text-xs">
            {item.dueAt && (
              <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
                <div className="flex items-center gap-1.5 text-zinc-500 text-[10px] font-mono uppercase">
                  <Calendar className="w-3 h-3 text-white" />
                  <span>Due Date</span>
                </div>
                <span className="font-mono text-zinc-200 mt-1 block">
                  {new Date(item.dueAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            )}

            {item.estimatedMinutes && (
              <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
                <div className="flex items-center gap-1.5 text-zinc-500 text-[10px] font-mono uppercase">
                  <Clock className="w-3 h-3 text-white" />
                  <span>Estimated Effort</span>
                </div>
                <span className="font-mono text-zinc-200 mt-1 block">
                  {item.estimatedMinutes} minutes
                </span>
              </div>
            )}

            {item.courseName && (
              <div className="col-span-2 p-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
                <div className="flex items-center gap-1.5 text-zinc-500 text-[10px] font-mono uppercase">
                  <Folder className="w-3 h-3 text-white" />
                  <span>Course</span>
                </div>
                <span className="text-zinc-200 mt-1 block font-medium">
                  {item.courseName}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Tags */}
        {item.tags && item.tags.length > 0 && (
          <div className="space-y-2">
            <span className="text-[11px] font-mono uppercase text-zinc-500 font-semibold">Tags</span>
            <div className="flex flex-wrap gap-1.5">
              {item.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded bg-zinc-900 text-[11px] font-mono text-zinc-300 border border-zinc-800"
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
              className="inline-flex items-center gap-2 text-xs text-zinc-300 hover:text-white underline font-medium"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open in upstream {item.source.replace("_", " ")}</span>
            </a>
          </div>
        )}

        {/* Action Controls */}
        <div className="pt-6 border-t border-zinc-800 space-y-2">
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
                  <Circle className="w-4 h-4 text-zinc-400" />
                  <span>Mark Incomplete</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>Mark Completed</span>
                </>
              )}
            </Button>
          )}

          <Button
            onClick={() => {
              onClose();
              router.push("/focus");
            }}
            className="w-full flex items-center justify-center gap-2 text-xs bg-white text-black font-semibold hover:bg-zinc-200"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Launch Focus Session for this Item</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => {
              onDelete(item.id);
              onClose();
            }}
            className="w-full flex items-center justify-center gap-2 text-xs text-zinc-400 hover:text-white hover:bg-zinc-900 border-zinc-800"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Item</span>
          </Button>
        </div>
      </div>
    </SlideOver>
  );
}
