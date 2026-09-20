"use client";

import { useState, useMemo } from "react";
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  MapPin, 
  Video, 
  ExternalLink,
  CalendarDays,
  AlertCircle,
  Trash2,
  RefreshCw
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
  const { items, toggleItemCompletion, deleteItem, syncAll, isSyncing, purgeDemoData } = useNexusStore();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<"day" | "week">("day");
  const [filterType, setFilterType] = useState<"events" | "all">("events");
  const [selectedItem, setSelectedItem] = useState<UnifiedItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Hours to show in day view: 07:00 to 23:00
  const hours = Array.from({ length: 17 }, (_, i) => i + 7);

  // Detect live synced items vs mock demo items
  const hasLiveItems = useMemo(() => {
    return items.some((i) => i.id.startsWith("gcal-") || i.id.startsWith("gtask-") || i.id.startsWith("notion-"));
  }, [items]);

  const hasDemoItems = useMemo(() => {
    return items.some((i) => i.id.startsWith("item-"));
  }, [items]);

  // Filter items for calendar display
  const calendarItems = useMemo(() => {
    return items.filter((item) => {
      if (hasLiveItems && item.id.startsWith("item-")) {
        return false;
      }
      if (filterType === "events") {
        return item.category === "calendar" || item.source === "google_calendar";
      }
      return true;
    });
  }, [items, hasLiveItems, filterType]);

  // Filter items for the selected day
  const dayItems = useMemo(() => {
    return calendarItems.filter((item) => {
      const targetDate = item.startAt || item.dueAt;
      if (!targetDate) return false;
      try {
        const d = parseISO(targetDate);
        return isSameDay(d, selectedDate);
      } catch {
        return false;
      }
    });
  }, [calendarItems, selectedDate]);

  // Separate all-day events vs timed events
  const allDayEvents = useMemo(() => {
    return dayItems.filter((i) => i.metadata?.isAllDay || (i.category === "calendar" && (!i.startAt || i.startAt.includes("T00:00:00"))));
  }, [dayItems]);

  const timedEvents = useMemo(() => {
    return dayItems.filter((i) => !allDayEvents.some((ad) => ad.id === i.id));
  }, [dayItems, allDayEvents]);

  // Week days for week view
  const weekDays = useMemo(() => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200/90 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-zinc-950" />
            <h1 className="text-2xl font-bold tracking-tight text-zinc-950">Calendar & Schedule</h1>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Google Calendar time blocks and daily scheduled commitments
          </p>
        </div>

        {/* Date Navigation & View Toggle */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Filter Toggle */}
          <div className="flex items-center bg-zinc-100 border border-zinc-200 rounded-lg p-0.5 text-xs">
            <button
              onClick={() => setFilterType("events")}
              className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                filterType === "events" 
                  ? "bg-white text-zinc-950 font-semibold shadow-xs border border-zinc-200/60" 
                  : "text-zinc-600 hover:text-zinc-950"
              }`}
              title="Show only Google Calendar events"
            >
              Events Only
            </button>
            <button
              onClick={() => setFilterType("all")}
              className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                filterType === "all" 
                  ? "bg-white text-zinc-950 font-semibold shadow-xs border border-zinc-200/60" 
                  : "text-zinc-600 hover:text-zinc-950"
              }`}
              title="Show events and tasks with due dates"
            >
              All (Events + Tasks)
            </button>
          </div>

          {/* Day / Week switch */}
          <div className="flex items-center bg-zinc-100 border border-zinc-200 rounded-lg p-0.5 text-xs">
            <button
              onClick={() => setViewMode("day")}
              className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                viewMode === "day" ? "bg-white text-zinc-950 font-semibold shadow-xs border border-zinc-200/60" : "text-zinc-600 hover:text-zinc-950"
              }`}
            >
              Day
            </button>
            <button
              onClick={() => setViewMode("week")}
              className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                viewMode === "week" ? "bg-white text-zinc-950 font-semibold shadow-xs border border-zinc-200/60" : "text-zinc-600 hover:text-zinc-950"
              }`}
            >
              Week
            </button>
          </div>

          {/* Sync Calendar Button */}
          <Button
            size="sm"
            variant="outline"
            onClick={syncAll}
            disabled={isSyncing}
            className="h-7 text-xs border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50 flex items-center gap-1.5 shadow-xs"
            title="Refresh schedule from Google Calendar"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">{isSyncing ? "Syncing..." : "Sync"}</span>
          </Button>

          {/* Prev / Today / Next Controls */}
          <div className="flex items-center gap-1 bg-white border border-zinc-200 rounded-lg p-0.5 shadow-xs">
            <button
              onClick={handlePrev}
              className="p-1.5 rounded hover:bg-zinc-100 text-zinc-600 hover:text-zinc-950 transition-colors"
              title="Previous"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-2.5 py-1 text-xs font-medium text-zinc-700 hover:text-zinc-950 rounded hover:bg-zinc-100 transition-colors"
            >
              Today
            </button>
            <button
              onClick={handleNext}
              className="p-1.5 rounded hover:bg-zinc-100 text-zinc-600 hover:text-zinc-950 transition-colors"
              title="Next"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="px-3 py-1.5 rounded-lg bg-white border border-zinc-200 font-mono text-xs text-zinc-900 shadow-xs">
            {format(selectedDate, "EEE, MMM d, yyyy")}
          </div>
        </div>
      </div>

      {/* Demo Data Notice Banner */}
      {hasDemoItems && (
        <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs">
          <div className="flex items-center gap-2 text-amber-900">
            <AlertCircle className="w-4 h-4 text-amber-700 flex-shrink-0" />
            <span>
              Sample mock items (tasks & events) are active in local memory. Clear them to display only your real connected Google schedule.
            </span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={purgeDemoData}
              className="h-7 text-xs border-amber-300 text-amber-900 bg-white hover:bg-amber-100 flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Purge Demo Items</span>
            </Button>
          </div>
        </div>
      )}

      {/* VIEW 1: DAY VIEW */}
      {viewMode === "day" && (
        <div className="space-y-4">
          {/* All-Day Events Banner */}
          {allDayEvents.length > 0 && (
            <div className="p-3.5 rounded-xl border border-zinc-200/90 bg-white/90 backdrop-blur-md space-y-2 shadow-xs">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5 text-zinc-950" />
                All-Day Events
              </span>
              <div className="flex flex-wrap gap-2">
                {allDayEvents.map((event) => (
                  <div
                    key={event.id}
                    onClick={() => handleOpenItem(event)}
                    className="px-3 py-1.5 rounded-lg bg-zinc-50 border border-zinc-200 text-xs text-zinc-800 hover:border-zinc-400 cursor-pointer transition-colors flex items-center gap-2 shadow-2xs"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-950" />
                    <span className="font-medium">{event.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timed Grid */}
          <div className="rounded-xl border border-zinc-200/90 bg-white/90 backdrop-blur-md p-4 space-y-3 shadow-[0_1px_3px_rgba(0,0,0,0.03),0_8px_24px_rgba(0,0,0,0.02)]">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-zinc-950">
                  {format(selectedDate, "EEEE, MMMM d")}
                </span>
                {isToday(selectedDate) && <Badge variant="secondary">Today</Badge>}
              </div>
              <span className="text-[11px] font-mono text-zinc-500">
                {dayItems.length} event{dayItems.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="divide-y divide-zinc-100 max-h-[700px] overflow-y-auto">
              {hours.map((hour) => {
                const hourLabel = `${hour.toString().padStart(2, "0")}:00`;
                
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
                    <span className="w-12 font-mono text-xs text-zinc-400 flex-shrink-0 pt-1">
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
                              className="p-3 rounded-lg border border-zinc-200/90 bg-zinc-50/80 hover:border-zinc-400 hover:bg-white text-zinc-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs transition-all cursor-pointer group shadow-xs"
                            >
                              <div className="space-y-1 min-w-0 pr-2">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-zinc-950 truncate">
                                    {item.title}
                                  </span>
                                  <Badge variant={isCalendar ? "default" : "secondary"}>
                                    {isCalendar ? "Calendar" : "Task"}
                                  </Badge>
                                </div>

                                {item.description && (
                                  <p className="text-[11px] text-zinc-600 line-clamp-1">
                                    {item.description}
                                  </p>
                                )}

                                <div className="flex items-center gap-3 text-[10px] text-zinc-500 font-mono">
                                  {timeStr && <span>⏱ {timeStr}</span>}
                                  {item.metadata?.location && (
                                    <span className="flex items-center gap-1">
                                      <MapPin className="w-3 h-3 text-zinc-700" />
                                      <span className="truncate max-w-[200px]">{item.metadata.location}</span>
                                    </span>
                                  )}
                                  {item.metadata?.hangoutLink && (
                                    <span className="flex items-center gap-1 text-zinc-800 font-medium">
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
                                    className="p-1.5 rounded hover:bg-zinc-200 text-zinc-500 hover:text-zinc-950 transition-colors"
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
                        <div className="h-4 w-full group-hover:bg-zinc-100/50 transition-colors rounded" />
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

            const itemsForDay = calendarItems.filter((item) => {
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
                className={`p-3.5 rounded-xl border flex flex-col space-y-3 cursor-pointer transition-all shadow-xs ${
                  isSelected
                    ? "bg-zinc-950 text-white border-zinc-950 ring-2 ring-zinc-950/20"
                    : "bg-white/90 border-zinc-200/90 hover:border-zinc-300"
                }`}
              >
                {/* Day Header */}
                <div className={`flex items-center justify-between border-b pb-2 ${isSelected ? "border-zinc-800" : "border-zinc-100"}`}>
                  <div>
                    <span className={`text-xs font-mono font-bold ${isSelected ? "text-zinc-300" : "text-zinc-500"}`}>
                      {format(day, "EEE")}
                    </span>
                    <p className={`text-base font-bold font-mono ${isSelected ? "text-white" : isDayToday ? "text-zinc-950 font-extrabold" : "text-zinc-700"}`}>
                      {format(day, "d")}
                    </p>
                  </div>
                  {isDayToday && <Badge variant={isSelected ? "default" : "secondary"}>Today</Badge>}
                </div>

                {/* Day Events Count & Mini List */}
                <div className="flex-1 space-y-1.5 min-h-[120px]">
                  {itemsForDay.slice(0, 4).map((item) => (
                    <div
                      key={item.id}
                      className={`p-1.5 rounded text-[11px] truncate ${
                        isSelected 
                          ? "bg-zinc-900 border border-zinc-800 text-zinc-100" 
                          : "bg-zinc-50 border border-zinc-200 text-zinc-800 hover:text-zinc-950"
                      }`}
                    >
                      <span className="truncate block font-medium">{item.title}</span>
                      <span className={`text-[10px] font-mono ${isSelected ? "text-zinc-400" : "text-zinc-500"}`}>
                        {item.startAt ? format(parseISO(item.startAt), "hh:mm a") : "All Day"}
                      </span>
                    </div>
                  ))}

                  {itemsForDay.length > 4 && (
                    <span className={`text-[10px] font-mono block pt-1 ${isSelected ? "text-zinc-400" : "text-zinc-500"}`}>
                      +{itemsForDay.length - 4} more
                    </span>
                  )}

                  {itemsForDay.length === 0 && (
                    <span className={`text-[11px] italic block pt-4 text-center ${isSelected ? "text-zinc-500" : "text-zinc-400"}`}>
                      No events
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

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
