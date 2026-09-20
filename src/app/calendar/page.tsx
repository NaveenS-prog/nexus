"use client";

import { useState, useMemo } from "react";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  MapPin, 
  Video, 
  ExternalLink,
  Layers,
  CheckCircle2,
  CalendarDays
} from "lucide-react";
import { useNexusStore } from "@/lib/data/store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ItemDetailDrawer } from "@/components/dashboard/ItemDetailDrawer";
import { UnifiedItem } from "@/lib/types";
import { 
  format, 
  addDays, 
  subDays, 
  isSameDay, 
  parseISO, 
  startOfWeek, 
  isToday 
} from "date-fns";

export default function CalendarPage() {
  const { items, toggleItemCompletion, deleteItem } = useNexusStore();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<"day" | "week">("day");
  const [selectedItem, setSelectedItem] = useState<UnifiedItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Hours to show in day view: 07:00 to 23:00
  const hours = Array.from({ length: 17 }, (_, i) => i + 7);

  // Filter items for the selected day
  const dayItems = useMemo(() => {
    return items.filter((item) => {
      const targetDate = item.startAt || item.dueAt;
      if (!targetDate) return false;
      try {
        const d = parseISO(targetDate);
        return isSameDay(d, selectedDate);
      } catch {
        return false;
      }
    });
  }, [items, selectedDate]);

  // Separate all-day events vs timed events
  const allDayEvents = useMemo(() => {
    return dayItems.filter((i) => i.metadata?.isAllDay || (i.category === "calendar" && (!i.startAt || i.startAt.includes("T00:00:00"))));
  }, [dayItems]);

  const timedEvents = useMemo(() => {
    return dayItems.filter((i) => !allDayEvents.some((ad) => ad.id === i.id));
  }, [dayItems, allDayEvents]);

  // Week days for week view
  const weekDays = useMemo(() => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 }); // Monday start
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [selectedDate]);

  const handlePrev = () => {
    if (viewMode === "day") setSelectedDate((d) => subDays(d, 1));
    else setSelectedDate((d) => subDays(d, 7));
  };

  const handleNext = () => {
    if (viewMode === "day") setSelectedDate((d) => addDays(d, 1));
    else setSelectedDate((d) => addDays(d, 7));
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  const handleOpenItem = (item: UnifiedItem) => {
    setSelectedItem(item);
    setDrawerOpen(true);
  };

  const formatEventTime = (item: UnifiedItem) => {
    try {
      if (item.startAt && item.dueAt) {
        const start = format(parseISO(item.startAt), "hh:mm a");
        const end = format(parseISO(item.dueAt), "hh:mm a");
        return `${start} - ${end}`;
      }
      if (item.startAt) return format(parseISO(item.startAt), "hh:mm a");
      if (item.dueAt) return `Due ${format(parseISO(item.dueAt), "hh:mm a")}`;
    } catch {
      // ignore
    }
    return "";
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-6">
        <div>
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-cyan-400" />
            <h1 className="text-2xl font-bold tracking-tight text-white">Calendar & Schedule</h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Google Calendar time blocks and daily scheduled commitments
          </p>
        </div>

        {/* Date Navigation & View Toggle */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Day / Week switch */}
          <div className="flex items-center bg-nexus-900 border border-white/[0.08] rounded-lg p-0.5 text-xs">
            <button
              onClick={() => setViewMode("day")}
              className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                viewMode === "day" ? "bg-white/[0.1] text-zinc-100" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Day
            </button>
            <button
              onClick={() => setViewMode("week")}
              className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                viewMode === "week" ? "bg-white/[0.1] text-zinc-100" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Week
            </button>
          </div>

          {/* Prev / Today / Next Controls */}
          <div className="flex items-center gap-1 bg-nexus-900 border border-white/[0.08] rounded-lg p-0.5">
            <button
              onClick={handlePrev}
              className="p-1.5 rounded hover:bg-white/[0.08] text-zinc-400 hover:text-zinc-100 transition-colors"
              title="Previous"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-2.5 py-1 text-xs font-medium text-zinc-300 hover:text-white rounded hover:bg-white/[0.06] transition-colors"
            >
              Today
            </button>
            <button
              onClick={handleNext}
              className="p-1.5 rounded hover:bg-white/[0.08] text-zinc-400 hover:text-zinc-100 transition-colors"
              title="Next"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="px-3 py-1.5 rounded-lg bg-nexus-900 border border-white/[0.08] font-mono text-xs text-zinc-200">
            {format(selectedDate, "EEE, MMM d, yyyy")}
          </div>
        </div>
      </div>

      {/* VIEW 1: DAY VIEW */}
      {viewMode === "day" && (
        <div className="space-y-4">
          {/* All-Day Events Banner */}
          {allDayEvents.length > 0 && (
            <div className="p-3 rounded-xl border border-cyan-500/20 bg-cyan-950/20 space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-semibold flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5" />
                All-Day Events
              </span>
              <div className="flex flex-wrap gap-2">
                {allDayEvents.map((event) => (
                  <div
                    key={event.id}
                    onClick={() => handleOpenItem(event)}
                    className="px-3 py-1.5 rounded-lg bg-cyan-900/40 border border-cyan-500/30 text-xs text-cyan-200 hover:border-cyan-400 cursor-pointer transition-colors flex items-center gap-2"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    <span className="font-medium">{event.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timed Grid */}
          <div className="rounded-xl border border-white/[0.08] bg-nexus-900/50 backdrop-blur-sm p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-zinc-200">
                  {format(selectedDate, "EEEE, MMMM d")}
                </span>
                {isToday(selectedDate) && <Badge variant="secondary">Today</Badge>}
              </div>
              <span className="text-[11px] font-mono text-zinc-400">
                {dayItems.length} event{dayItems.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="divide-y divide-white/[0.04] max-h-[700px] overflow-y-auto">
              {hours.map((hour) => {
                const hourLabel = `${hour.toString().padStart(2, "0")}:00`;
                
                // Match events whose start hour is this hour
                const matching = timedEvents.filter((item) => {
                  if (item.startAt) {
                    try {
                      return parseISO(item.startAt).getHours() === hour;
                    } catch {
                      return false;
                    }
                  }
                  if (item.dueAt) {
                    try {
                      return parseISO(item.dueAt).getHours() === hour;
                    } catch {
                      return false;
                    }
                  }
                  return false;
                });

                return (
                  <div key={hour} className="py-2.5 flex items-start gap-4 min-h-[52px] group">
                    <span className="w-12 font-mono text-xs text-zinc-500 flex-shrink-0 pt-1">
                      {hourLabel}
                    </span>

                    <div className="flex-1 space-y-1.5">
                      {matching.length > 0 ? (
                        matching.map((item) => {
                          const timeStr = formatEventTime(item);
                          const isCalendar = item.category === "calendar";
                          return (
                            <div
                              key={item.id}
                              onClick={() => handleOpenItem(item)}
                              className={`p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs transition-all cursor-pointer group shadow-sm ${
                                isCalendar
                                  ? "bg-cyan-950/30 border-cyan-500/30 hover:border-cyan-400 text-cyan-100"
                                  : "bg-indigo-950/30 border-indigo-500/30 hover:border-indigo-400 text-indigo-100"
                              }`}
                            >
                              <div className="space-y-1 min-w-0 pr-2">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-zinc-100 group-hover:text-white truncate">
                                    {item.title}
                                  </span>
                                  <Badge variant={isCalendar ? "cyan" : "default"}>
                                    {isCalendar ? "Calendar" : "Task"}
                                  </Badge>
                                </div>

                                {item.description && (
                                  <p className="text-[11px] text-zinc-400 line-clamp-1">
                                    {item.description}
                                  </p>
                                )}

                                <div className="flex items-center gap-3 text-[10px] text-zinc-400 font-mono">
                                  {timeStr && <span>⏱ {timeStr}</span>}
                                  {item.metadata?.location && (
                                    <span className="flex items-center gap-1">
                                      <MapPin className="w-3 h-3 text-cyan-400" />
                                      <span className="truncate max-w-[200px]">{item.metadata.location}</span>
                                    </span>
                                  )}
                                  {item.metadata?.hangoutLink && (
                                    <span className="flex items-center gap-1 text-emerald-400">
                                      <Video className="w-3 h-3" />
                                      <span>Google Meet</span>
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
                                {item.url && (
                                  <a
                                    href={item.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="p-1.5 rounded hover:bg-white/[0.1] text-zinc-400 hover:text-white transition-colors"
                                    title="Open in Google Calendar"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </a>
                                )}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="h-4 w-full group-hover:bg-white/[0.015] transition-colors rounded" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: WEEK VIEW */}
      {viewMode === "week" && (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {weekDays.map((day) => {
            const isSelected = isSameDay(day, selectedDate);
            const isDayToday = isToday(day);

            // Filter items for this specific weekday
            const itemsForDay = items.filter((item) => {
              const target = item.startAt || item.dueAt;
              if (!target) return false;
              try {
                return isSameDay(parseISO(target), day);
              } catch {
                return false;
              }
            });

            return (
              <div
                key={day.toISOString()}
                onClick={() => {
                  setSelectedDate(day);
                  setViewMode("day");
                }}
                className={`p-3.5 rounded-xl border flex flex-col space-y-3 cursor-pointer transition-all ${
                  isSelected
                    ? "bg-nexus-900 border-cyan-500/50 ring-1 ring-cyan-500/30"
                    : "bg-nexus-900/50 border-white/[0.08] hover:border-white/[0.2]"
                }`}
              >
                {/* Day Header */}
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                  <div>
                    <span className="text-xs font-mono font-bold text-zinc-200">
                      {format(day, "EEE")}
                    </span>
                    <p className={`text-base font-bold font-mono ${isDayToday ? "text-cyan-400" : "text-zinc-400"}`}>
                      {format(day, "d")}
                    </p>
                  </div>
                  {isDayToday && <Badge variant="secondary">Today</Badge>}
                </div>

                {/* Day Events Count & Mini List */}
                <div className="flex-1 space-y-1.5 min-h-[120px]">
                  {itemsForDay.slice(0, 4).map((item) => (
                    <div
                      key={item.id}
                      className="p-1.5 rounded bg-nexus-950/80 border border-white/[0.06] text-[11px] truncate text-zinc-300 hover:text-white"
                    >
                      <span className="truncate block font-medium">{item.title}</span>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {item.startAt ? format(parseISO(item.startAt), "hh:mm a") : "All Day"}
                      </span>
                    </div>
                  ))}

                  {itemsForDay.length > 4 && (
                    <span className="text-[10px] text-zinc-500 font-mono block pt-1">
                      +{itemsForDay.length - 4} more
                    </span>
                  )}

                  {itemsForDay.length === 0 && (
                    <span className="text-[11px] text-zinc-600 italic block pt-4 text-center">
                      No events
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Item Detail Drawer */}
      <ItemDetailDrawer
        item={selectedItem}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onToggleStatus={toggleItemCompletion}
        onDelete={deleteItem}
      />
    </div>
  );
}
