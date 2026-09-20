"use client";

import { useState } from "react";
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { useNexusStore } from "@/lib/data/store";
import { Badge } from "@/components/ui/badge";
import { format, addDays, startOfWeek } from "date-fns";

export default function CalendarPage() {
  const { items } = useNexusStore();
  const [currentDate] = useState(new Date());

  const calendarItems = items.filter((i) => i.category === "calendar" || i.startAt);

  const hours = Array.from({ length: 14 }, (_, i) => i + 8); // 8:00 to 21:00

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-6">
        <div>
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-cyan-400" />
            <h1 className="text-2xl font-bold tracking-tight text-white">Calendar & Schedule</h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Google Calendar synchronizer — lectures, workout blocks, and scheduled focus slots
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs text-zinc-300 bg-nexus-900 border border-white/[0.08] px-3 py-1.5 rounded-lg">
          <span>{format(currentDate, "MMMM yyyy")}</span>
        </div>
      </div>

      {/* Daily Time Grid */}
      <div className="rounded-xl border border-white/[0.08] bg-nexus-900/50 backdrop-blur-sm p-4 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
          <span className="text-xs font-semibold text-zinc-200">Today's Schedule Block ({format(currentDate, "EEEE, MMM d")})</span>
          <span className="text-[11px] font-mono text-cyan-400">Synced with Google Calendar</span>
        </div>

        <div className="divide-y divide-white/[0.04] max-h-[600px] overflow-y-auto">
          {hours.map((hour) => {
            const hourLabel = `${hour.toString().padStart(2, "0")}:00`;
            const matchingItems = calendarItems.filter((item) => {
              if (!item.startAt) return false;
              const itemHour = new Date(item.startAt).getHours();
              return itemHour === hour;
            });

            return (
              <div key={hour} className="py-3 flex items-start gap-4 min-h-[56px] group">
                <span className="w-12 font-mono text-xs text-zinc-500 flex-shrink-0 pt-0.5">
                  {hourLabel}
                </span>

                <div className="flex-1 space-y-1.5">
                  {matchingItems.length > 0 ? (
                    matchingItems.map((item) => (
                      <div
                        key={item.id}
                        className="p-2.5 rounded-lg bg-cyan-950/20 border border-cyan-500/30 flex items-center justify-between text-xs"
                      >
                        <div className="space-y-0.5">
                          <p className="font-semibold text-cyan-200">{item.title}</p>
                          {item.description && (
                            <p className="text-[11px] text-zinc-400">{item.description}</p>
                          )}
                        </div>
                        <Badge variant="cyan">{item.estimatedMinutes || 60}m</Badge>
                      </div>
                    ))
                  ) : (
                    <div className="h-4 w-full group-hover:bg-white/[0.01] transition-colors rounded" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
