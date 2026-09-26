"use client";

import { useState, useMemo, useRef, useEffect } from "react";
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
  CalendarDays,
  AlertCircle,
  Trash2,
  RefreshCw,
  Filter,
  Plus
} from "lucide-react";
import { useNexusStore } from "@/lib/data/store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ItemDetailDrawer } from "@/components/dashboard/ItemDetailDrawer";
import { CreateEventModal } from "@/components/calendar/CreateEventModal";
import { UnifiedItem } from "@/lib/types";
import { findAllFreeSlots } from "@/lib/calendar/slotFinder";
import { smartTriageItem, isExamItem, getDomainBadgeProps } from "@/lib/nlp/itemClassifier";
import { 
  format, 
  addDays, 
  subDays, 
  isSameDay, 
  parseISO, 
  startOfWeek, 
  isToday, 
  addMinutes,
  subMinutes
} from "date-fns";

const HOUR_HEIGHT = 80; // pixels per hour in timeline grid (1 min = 1.33px)

export default function CalendarPage() {
  const { items, addItem, toggleItemCompletion, deleteItem, syncAll, isSyncing, purgeDemoData } = useNexusStore();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<"day" | "week">("day");
  const [filterType, setFilterType] = useState<"events" | "exams" | "classes" | "personal" | "all">("events");
  const [selectedItem, setSelectedItem] = useState<UnifiedItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [slotFeedback, setSlotFeedback] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);
  const timelineContainerRef = useRef<HTMLDivElement>(null);

  // Update current time every minute for live "now" indicator
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Compute all free slots between 9:00 AM and 4:00 PM (down to 5m and 10m gaps)
  const availableSlots = useMemo(() => {
    return findAllFreeSlots(items, selectedDate, 5, "Study Block");
  }, [items, selectedDate]);

  // Detect live synced items vs mock demo items
  const hasLiveItems = useMemo(() => {
    return items.some((i) => i.id.startsWith("gcal-") || i.id.startsWith("gtask-") || i.id.startsWith("notion-"));
  }, [items]);

  const hasDemoItems = useMemo(() => {
    return items.some((i) => i.id.startsWith("item-"));
  }, [items]);

  // Autonomous Filter items for calendar display
  const calendarItems = useMemo(() => {
    return items.filter((item) => {
      // If live items exist, strip out mock demo items
      if (hasLiveItems && item.id.startsWith("item-")) {
        return false;
      }
      const triage = smartTriageItem(item);
      const isExam = isExamItem(item) || triage.domain === "exam" || item.tags?.includes("Exam");

      if (filterType === "exams") {
        return isExam;
      }
      if (filterType === "classes") {
        return triage.domain === "class_lecture";
      }
      if (filterType === "personal") {
        return triage.domain === "personal";
      }
      if (filterType === "events") {
        return item.category === "calendar" || item.source === "google_calendar" || isExam;
      }
      return true; // "all"
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

  // Determine timeline hours range (defaults to 07:00 to 23:00, or expands if events are earlier/later)
  const startHour = useMemo(() => {
    let min = 7;
    for (const item of timedEvents) {
      if (item.startAt) {
        try {
          const h = parseISO(item.startAt).getHours();
          if (h < min) min = h;
        } catch {}
      } else if (item.dueAt) {
        try {
          const h = parseISO(item.dueAt).getHours();
          if (h < min) min = h;
        } catch {}
      }
    }
    return Math.max(0, min);
  }, [timedEvents]);

  const endHour = useMemo(() => {
    let max = 23;
    for (const item of timedEvents) {
      const target = item.dueAt || item.startAt;
      if (target) {
        try {
          const h = parseISO(target).getHours();
          if (h > max) max = Math.min(23, h + 1);
        } catch {}
      }
    }
    return max;
  }, [timedEvents]);

  const hours = useMemo(() => {
    return Array.from({ length: endHour - startHour + 1 }, (_, i) => i + startHour);
  }, [startHour, endHour]);

  // Compute positioned events with exact top, height, and side-by-side columns for overlaps
  const positionedEvents = useMemo(() => {
    if (timedEvents.length === 0) return [];

    const eventsWithTimes = timedEvents.map((item) => {
      let startD: Date;
      let endD: Date;

      try {
        if (item.startAt) {
          startD = parseISO(item.startAt);
          endD = item.dueAt ? parseISO(item.dueAt) : addMinutes(startD, item.estimatedMinutes || 60);
        } else if (item.dueAt) {
          endD = parseISO(item.dueAt);
          startD = subMinutes(endD, item.estimatedMinutes || 60);
        } else {
          startD = new Date(selectedDate);
          startD.setHours(9, 0, 0, 0);
          endD = addMinutes(startD, 60);
        }
      } catch {
        startD = new Date(selectedDate);
        startD.setHours(9, 0, 0, 0);
        endD = addMinutes(startD, 60);
      }

      let startMins = startD.getHours() * 60 + startD.getMinutes();
      let endMins = endD.getHours() * 60 + endD.getMinutes();

      // If end time is before or equal to start time (e.g. overnight or invalid), enforce default duration
      if (endMins <= startMins) {
        endMins = startMins + Math.max(item.estimatedMinutes || 60, 30);
      }

      return {
        item,
        startMins,
        endMins,
        duration: endMins - startMins,
      };
    });

    // Sort: earlier start first, longer duration first
    eventsWithTimes.sort((a, b) => {
      if (a.startMins !== b.startMins) return a.startMins - b.startMins;
      return b.duration - a.duration;
    });

    // Group into clusters of overlapping events
    const clusters: (typeof eventsWithTimes)[] = [];
    let currentCluster: typeof eventsWithTimes = [];
    let clusterEnd = -1;

    for (const ev of eventsWithTimes) {
      if (currentCluster.length === 0) {
        currentCluster.push(ev);
        clusterEnd = ev.endMins;
      } else if (ev.startMins < clusterEnd) {
        currentCluster.push(ev);
        clusterEnd = Math.max(clusterEnd, ev.endMins);
      } else {
        clusters.push(currentCluster);
        currentCluster = [ev];
        clusterEnd = ev.endMins;
      }
    }
    if (currentCluster.length > 0) {
      clusters.push(currentCluster);
    }

    interface PositionedResult {
      item: UnifiedItem;
      top: number;
      height: number;
      startMinutes: number;
      endMinutes: number;
      column: number;
      totalColumns: number;
    }

    const result: PositionedResult[] = [];
    const gridStartMins = startHour * 60;

    for (const cluster of clusters) {
      const columns: number[] = [];
      const clusterPositions: { ev: (typeof eventsWithTimes)[0]; col: number }[] = [];

      for (const ev of cluster) {
        let placedCol = -1;
        for (let i = 0; i < columns.length; i++) {
          if (ev.startMins >= columns[i]) {
            placedCol = i;
            columns[i] = ev.endMins;
            break;
          }
        }
        if (placedCol === -1) {
          placedCol = columns.length;
          columns.push(ev.endMins);
        }
        clusterPositions.push({ ev, col: placedCol });
      }

      const totalColumns = Math.max(1, columns.length);

      for (const cp of clusterPositions) {
        const top = Math.max(0, (cp.ev.startMins - gridStartMins) * (HOUR_HEIGHT / 60));
        const height = Math.max(30, (cp.ev.endMins - cp.ev.startMins) * (HOUR_HEIGHT / 60));

        result.push({
          item: cp.ev.item,
          top,
          height,
          startMinutes: cp.ev.startMins,
          endMinutes: cp.ev.endMins,
          column: cp.col,
          totalColumns,
        });
      }
    }

    return result;
  }, [timedEvents, selectedDate, startHour]);

  // Auto-scroll timeline to current time or earliest event
  useEffect(() => {
    if (!timelineContainerRef.current) return;
    if (isToday(selectedDate)) {
      const now = new Date();
      const currentMins = now.getHours() * 60 + now.getMinutes();
      const targetScroll = Math.max(0, (currentMins - startHour * 60 - 45) * (HOUR_HEIGHT / 60));
      timelineContainerRef.current.scrollTop = targetScroll;
    } else if (positionedEvents.length > 0) {
      const firstStart = positionedEvents[0].startMinutes;
      const targetScroll = Math.max(0, (firstStart - startHour * 60 - 30) * (HOUR_HEIGHT / 60));
      timelineContainerRef.current.scrollTop = targetScroll;
    }
  }, [selectedDate, startHour, positionedEvents.length]);

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
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-6 animate-fade-in text-ink">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-hairline pb-6">
        <div>
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-olive" />
            <h1 className="text-2xl font-serif font-semibold tracking-tight text-ink">Calendar & Schedule</h1>
          </div>
          <p className="text-xs text-ink-muted mt-1">
            Google Calendar time blocks and daily scheduled commitments
          </p>
        </div>

        {/* Date Navigation & View Toggle */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Filter Toggle: Events, Exams, Classes, Personal, All */}
          <div className="flex items-center bg-canvas-secondary border border-hairline rounded-lg p-0.5 text-xs overflow-x-auto">
            <button
              onClick={() => setFilterType("events")}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                filterType === "events" 
                  ? "bg-surface text-ink font-semibold shadow-xs" 
                  : "text-ink-muted hover:text-ink"
              }`}
              title="Show all calendar events"
            >
              Events
            </button>
            <button
              onClick={() => setFilterType("exams")}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                filterType === "exams" 
                  ? "bg-terracotta text-white font-semibold shadow-xs" 
                  : "text-ink-muted hover:text-terracotta"
              }`}
              title="Filter to Examinations and Tests"
            >
              Exams
            </button>
            <button
              onClick={() => setFilterType("classes")}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                filterType === "classes" 
                  ? "bg-olive text-white font-semibold shadow-xs" 
                  : "text-ink-muted hover:text-olive"
              }`}
              title="Filter to Timetable Lectures & Classes"
            >
              Classes
            </button>
            <button
              onClick={() => setFilterType("personal")}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                filterType === "personal" 
                  ? "bg-stone-700 text-white font-semibold shadow-xs" 
                  : "text-ink-muted hover:text-ink"
              }`}
              title="Filter to Personal Life and Errands"
            >
              Personal
            </button>
            <button
              onClick={() => setFilterType("all")}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                filterType === "all" 
                  ? "bg-surface text-ink font-semibold shadow-xs" 
                  : "text-ink-muted hover:text-ink"
              }`}
              title="Show all events, exams, and tasks"
            >
              All
            </button>
          </div>

          {/* Day / Week switch */}
          <div className="flex items-center bg-canvas-secondary border border-hairline rounded-lg p-0.5 text-xs">
            <button
              onClick={() => setViewMode("day")}
              className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                viewMode === "day" ? "bg-surface text-ink font-semibold shadow-xs" : "text-ink-muted hover:text-ink"
              }`}
            >
              Day
            </button>
            <button
              onClick={() => setViewMode("week")}
              className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                viewMode === "week" ? "bg-surface text-ink font-semibold shadow-xs" : "text-ink-muted hover:text-ink"
              }`}
            >
              Week
            </button>
          </div>

          {/* Add All-Day / Event Button */}
          <Button
            size="sm"
            onClick={() => setIsCreateEventOpen(true)}
            className="h-7 text-xs bg-olive hover:bg-olive-hover text-white font-medium flex items-center gap-1.5 shadow-xs cursor-pointer"
            title="Create an event or all-day milestone"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Event</span>
          </Button>

          {/* Sync Calendar Button */}
          <Button
            size="sm"
            variant="outline"
            onClick={syncAll}
            disabled={isSyncing}
            className="h-7 text-xs border-hairline text-ink-secondary hover:text-ink hover:bg-canvas-secondary flex items-center gap-1.5"
            title="Refresh schedule from Google Calendar"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">{isSyncing ? "Syncing..." : "Sync"}</span>
          </Button>

          {/* Prev / Today / Next Controls */}
          <div className="flex items-center gap-1 bg-canvas-secondary border border-hairline rounded-lg p-0.5">
            <button
              onClick={handlePrev}
              className="p-1.5 rounded hover:bg-surface text-ink-muted hover:text-ink transition-colors"
              title="Previous"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-2.5 py-1 text-xs font-medium text-ink-secondary hover:text-ink rounded hover:bg-surface transition-colors"
            >
              Today
            </button>
            <button
              onClick={handleNext}
              className="p-1.5 rounded hover:bg-surface text-ink-muted hover:text-ink transition-colors"
              title="Next"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="px-3 py-1.5 rounded-lg bg-surface border border-hairline font-mono text-xs text-ink">
            {format(selectedDate, "EEE, MMM d, yyyy")}
          </div>
        </div>
      </div>

      {/* Demo Data Notice Banner */}
      {hasDemoItems && (
        <div className="p-3.5 rounded-xl border border-hairline bg-canvas-secondary/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-ink-secondary">
            <AlertCircle className="w-4 h-4 text-olive flex-shrink-0" />
            <span>
              Sample mock items (tasks & events) are active in local memory. Clear them to display only your real connected Google schedule.
            </span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={purgeDemoData}
              className="h-7 text-xs border-hairline text-ink-secondary hover:text-ink hover:bg-surface flex items-center gap-1.5"
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
          <div className="p-4 rounded-xl border border-hairline bg-surface space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-ink-muted font-semibold flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5 text-olive" />
                All-Day Events {allDayEvents.length > 0 ? `(${allDayEvents.length})` : ""}
              </span>
              <button
                type="button"
                onClick={() => setIsCreateEventOpen(true)}
                className="text-[11px] font-mono text-ink-muted hover:text-olive flex items-center gap-1 transition-colors cursor-pointer"
                title="Create an all-day event for this day"
              >
                <Plus className="w-3 h-3 text-olive" />
                <span>Add All-Day Event</span>
              </button>
            </div>

            {allDayEvents.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {allDayEvents.map((event) => (
                  <div
                    key={event.id}
                    onClick={() => handleOpenItem(event)}
                    className="px-3 py-1.5 rounded-lg bg-canvas border border-hairline text-xs text-ink hover:border-olive/50 cursor-pointer transition-colors flex items-center gap-2 group"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-olive group-hover:scale-125 transition-transform" />
                    <span className="font-medium">{event.title}</span>
                    {event.tags?.includes("Exam") && (
                      <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-terracotta-light/30 text-terracotta border border-terracotta/20 font-bold uppercase">
                        EXAM
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-between text-xs text-ink-muted py-0.5">
                <span>No all-day events scheduled for this day.</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsCreateEventOpen(true)}
                  className="h-6 text-[11px] border-hairline bg-canvas hover:bg-canvas-secondary text-ink-secondary flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add All-Day Event</span>
                </Button>
              </div>
            )}
          </div>

          {/* Available Free Slots Banner (9:00 AM – 4:00 PM) */}
          <div className="p-4 rounded-xl border border-hairline bg-surface space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-olive font-semibold flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-olive" />
                Available Free Slots (9:00 AM – 4:00 PM)
              </span>
              <span className="text-[11px] font-mono text-ink-muted">
                {availableSlots.length} slot{availableSlots.length !== 1 ? "s" : ""} found (down to 5m)
              </span>
            </div>

            {availableSlots.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {availableSlots.map((slot, idx) => {
                  const mins = slot.durationMinutes || 5;
                  const isSmall = mins <= 10;
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        addItem({
                          source: "google_calendar",
                          title: "Study Block",
                          category: "calendar",
                          priority: "medium",
                          status: "pending",
                          startAt: slot.start,
                          dueAt: slot.end,
                          estimatedMinutes: mins,
                          description: `Scheduled free slot (${slot.formattedTimeRange})`,
                        });
                        setSlotFeedback(`✓ Booked Study Block for ${slot.formattedTimeRange}`);
                        setTimeout(() => setSlotFeedback(null), 2500);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-canvas border border-hairline hover:border-olive hover:bg-olive-light/10 text-xs text-ink transition-all flex items-center gap-2 group cursor-pointer"
                      title="Click to schedule a Study Block in this slot"
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${isSmall ? "bg-amber-600" : "bg-olive"}`} />
                      <span className="font-mono text-[11px] text-ink group-hover:text-olive">
                        {slot.formattedTimeRange}
                      </span>
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.2 rounded border ${
                          isSmall
                            ? "bg-canvas-secondary border-hairline text-ink-muted"
                            : "bg-olive-light/20 border-olive/30 text-olive"
                        }`}
                      >
                        {mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h${mins % 60 ? ` ${mins % 60}m` : ""}`}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-ink-muted">
                No free slots available between 9:00 AM and 4:00 PM for this day.
              </p>
            )}

            {slotFeedback && (
              <div className="text-xs text-olive font-mono pt-1 flex items-center gap-1.5 animate-fade-in">
                <span>✓</span>
                <span>{slotFeedback}</span>
              </div>
            )}
          </div>

          {/* Proportional Google Calendar Day Timeline Grid */}
          <div className="rounded-xl border border-hairline bg-surface p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-hairline">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-ink font-serif">
                  {format(selectedDate, "EEEE, MMMM d")}
                </span>
                {isToday(selectedDate) && <Badge variant="olive">Today</Badge>}
              </div>
              <span className="text-[11px] font-mono text-ink-muted">
                {dayItems.length} event{dayItems.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Scrollable Timeline Grid Container */}
            <div
              ref={timelineContainerRef}
              className="relative max-h-[720px] overflow-y-auto select-none rounded-lg border border-hairline bg-canvas/40"
            >
              <div
                className="relative min-w-[500px]"
                style={{ height: `${hours.length * HOUR_HEIGHT}px` }}
              >
                {/* Background Grid Lines (1 row per hour, with 30-min dashed line) */}
                {hours.map((hour) => {
                  const hourLabel = `${hour.toString().padStart(2, "0")}:00`;
                  return (
                    <div
                      key={hour}
                      className="absolute left-0 right-0 border-t border-hairline flex items-start"
                      style={{
                        top: `${(hour - startHour) * HOUR_HEIGHT}px`,
                        height: `${HOUR_HEIGHT}px`,
                      }}
                    >
                      {/* Left Hour Label */}
                      <span className="w-14 sm:w-16 font-mono text-xs text-ink-muted pr-3 text-right flex-shrink-0 -translate-y-2.5 select-none">
                        {hourLabel}
                      </span>

                      {/* Right Grid Slot with Half-Hour Guide Line */}
                      <div className="flex-1 h-full border-l border-hairline relative">
                        <div className="absolute left-0 right-0 top-1/2 border-t border-divider border-dashed pointer-events-none" />
                      </div>
                    </div>
                  );
                })}

                {/* Google Calendar Current Time "Now" Red Line Indicator */}
                {isToday(selectedDate) && (() => {
                  const currentMins = currentTime.getHours() * 60 + currentTime.getMinutes();
                  const gridStartMins = startHour * 60;
                  const gridEndMins = (endHour + 1) * 60;
                  if (currentMins >= gridStartMins && currentMins <= gridEndMins) {
                    const redLineTop = (currentMins - gridStartMins) * (HOUR_HEIGHT / 60);
                    return (
                      <div
                        className="absolute left-14 sm:left-16 right-0 pointer-events-none z-20 flex items-center"
                        style={{ top: `${redLineTop}px` }}
                      >
                        <div className="w-2.5 h-2.5 rounded-full bg-terracotta -ml-1.5 shadow-sm" />
                        <div className="flex-1 h-[2px] bg-terracotta shadow-xs" />
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Absolutely Positioned Events Overlay */}
                <div className="absolute top-0 right-3 left-14 sm:left-16 bottom-0 pointer-events-none">
                  {positionedEvents.map((ev) => {
                    const timeStr = formatEventTime(ev.item);
                    const isCalendar = ev.item.category === "calendar" || ev.item.source === "google_calendar";
                    const triage = smartTriageItem(ev.item);
                    const isExam = isExamItem(ev.item) || triage.domain === "exam" || ev.item.tags?.includes("Exam");
                    const isClass = triage.domain === "class_lecture";
                    const isStudyBlock = ev.item.title === "Study Block" || ev.item.title === "Focus Block" || ev.item.description?.includes("Study Block") || ev.item.description?.includes("Focus Block");

                    // Subtle, restrained domain coloring
                    let colorStyle = "bg-surface border-hairline hover:border-olive/50 text-ink border-l-olive";
                    let domainBadgeLabel = isCalendar ? "CALENDAR" : "TASK";
                    let domainBadgeClass = "bg-canvas-secondary text-ink-secondary border-hairline";

                    if (isExam) {
                      colorStyle = "bg-[#FDF6F0] border-[#EBD5C8] hover:border-terracotta text-ink border-l-terracotta shadow-xs";
                      domainBadgeLabel = "EXAM";
                      domainBadgeClass = "bg-terracotta-light/30 text-terracotta border-terracotta/20 font-bold";
                    } else if (isClass) {
                      colorStyle = "bg-[#F7F4FA] border-[#E5DEEE] hover:border-purple-400 text-ink border-l-purple-600";
                      domainBadgeLabel = "CLASS";
                      domainBadgeClass = "bg-purple-100 text-purple-700 border-purple-200 font-bold";
                    } else if (isStudyBlock) {
                      colorStyle = "bg-olive-light/20 border-olive/30 hover:border-olive text-ink border-l-olive";
                      domainBadgeLabel = "STUDY";
                      domainBadgeClass = "bg-olive-light/40 text-olive border-olive/30 font-bold";
                    } else if (triage.domain === "personal") {
                      colorStyle = "bg-surface border-hairline hover:border-stone-400 text-ink border-l-stone-400";
                      domainBadgeLabel = "PERSONAL";
                      domainBadgeClass = "bg-canvas-secondary text-ink-muted border-hairline font-bold";
                    } else if (triage.domain === "project_dev") {
                      colorStyle = "bg-surface border-hairline hover:border-amber-500/50 text-ink border-l-amber-600";
                      domainBadgeLabel = "DEV";
                      domainBadgeClass = "bg-amber-50 text-amber-800 border-amber-200 font-bold";
                    }

                    const isTall = ev.height >= 64;

                    return (
                      <div
                        key={ev.item.id}
                        onClick={() => handleOpenItem(ev.item)}
                        style={{
                          top: `${ev.top}px`,
                          height: `${ev.height}px`,
                          left: `calc(${ev.column * (100 / ev.totalColumns)}% + 2px)`,
                          width: `calc(${100 / ev.totalColumns}% - 4px)`,
                        }}
                        className={`absolute pointer-events-auto rounded-lg border border-l-4 p-2 sm:p-2.5 transition-all duration-150 cursor-pointer group shadow-xs hover:shadow-sm z-10 hover:z-30 overflow-hidden flex flex-col justify-between ${colorStyle}`}
                        title={`${ev.item.title} (${timeStr})`}
                      >
                        {isTall ? (
                          <>
                            <div className="space-y-1 min-w-0 pr-1">
                              <div className="flex items-center justify-between gap-1.5">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="font-semibold text-xs text-ink truncate group-hover:underline">
                                    {ev.item.title}
                                  </span>
                                  <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded border uppercase hidden sm:inline-flex ${domainBadgeClass}`}>
                                    {domainBadgeLabel}
                                  </span>
                                </div>

                                {ev.item.url && (
                                  <a
                                    href={ev.item.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="p-1 rounded hover:bg-canvas-secondary text-ink-muted hover:text-ink transition-colors flex-shrink-0"
                                    title="Open in Google Calendar"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              </div>

                              {ev.item.description && ev.height >= 85 && (
                                <p className="text-[11px] text-ink-muted line-clamp-1">
                                  {ev.item.description}
                                </p>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-ink-muted font-mono pt-1">
                              {timeStr && (
                                <span className="flex items-center gap-1 font-semibold text-ink">
                                  <Clock className="w-3 h-3 text-ink-muted" />
                                  <span>{timeStr}</span>
                                </span>
                              )}
                              {ev.item.metadata?.location && (
                                <span className="flex items-center gap-1 text-ink-secondary">
                                  <MapPin className="w-3 h-3 text-ink-muted" />
                                  <span className="truncate max-w-[140px]">{ev.item.metadata.location}</span>
                                </span>
                              )}
                              {ev.item.metadata?.hangoutLink && (
                                <span className="flex items-center gap-1 text-olive font-sans">
                                  <Video className="w-3 h-3" />
                                  <span>Meet</span>
                                </span>
                              )}
                            </div>
                          </>
                        ) : (
                          <div className="flex items-center justify-between h-full w-full gap-2">
                            <div className="flex items-center gap-2 truncate">
                              <span className="font-semibold text-xs text-ink truncate">
                                {ev.item.title}
                              </span>
                              <span className="text-[10px] text-ink-muted font-mono truncate">
                                {timeStr}
                              </span>
                            </div>
                            {ev.item.url && (
                              <a
                                href={ev.item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="p-0.5 rounded hover:bg-canvas-secondary text-ink-muted hover:text-ink flex-shrink-0"
                                title="Open in Google Calendar"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
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
                className={`p-3.5 rounded-xl border flex flex-col space-y-3 cursor-pointer transition-all ${
                  isSelected
                    ? "bg-canvas border-olive ring-1 ring-olive/20 shadow-xs"
                    : "bg-surface border-hairline hover:border-olive/40"
                }`}
              >
                {/* Day Header */}
                <div className="flex items-center justify-between border-b border-hairline pb-2">
                  <div>
                    <span className="text-xs font-mono font-bold text-ink-secondary">
                      {format(day, "EEE")}
                    </span>
                    <p className={`text-base font-bold font-mono ${isDayToday ? "text-olive font-extrabold" : "text-ink"}`}>
                      {format(day, "d")}
                    </p>
                  </div>
                  {isDayToday && <Badge variant="olive">Today</Badge>}
                </div>

                {/* Day Events Count & Mini List */}
                <div className="flex-1 space-y-1.5 min-h-[120px]">
                  {itemsForDay.slice(0, 4).map((item) => {
                    const isExam = isExamItem(item) || smartTriageItem(item).domain === "exam" || item.tags?.includes("Exam");
                    return (
                      <div
                        key={item.id}
                        className={`p-1.5 rounded text-[11px] truncate transition-colors ${
                          isExam
                            ? "bg-[#FDF6F0] border border-[#EBD5C8] text-ink hover:text-terracotta shadow-xs"
                            : "bg-canvas border border-hairline text-ink hover:text-olive"
                        }`}
                      >
                        <div className="flex items-center gap-1 min-w-0">
                          {isExam && (
                            <span className="text-[8px] font-mono px-1 py-0 rounded bg-terracotta-light/30 text-terracotta border border-terracotta/20 font-bold shrink-0">
                              EXAM
                            </span>
                          )}
                          <span className="truncate block font-medium">{item.title}</span>
                        </div>
                        <span className="text-[10px] text-ink-muted font-mono">
                          {item.startAt && item.dueAt 
                            ? `${format(parseISO(item.startAt), "hh:mm a")} - ${format(parseISO(item.dueAt), "hh:mm a")}`
                            : item.startAt 
                              ? format(parseISO(item.startAt), "hh:mm a") 
                              : "All Day"}
                        </span>
                      </div>
                    );
                  })}

                  {itemsForDay.length > 4 && (
                    <span className="text-[10px] text-ink-muted font-mono block pt-1">
                      +{itemsForDay.length - 4} more
                    </span>
                  )}

                  {itemsForDay.length === 0 && (
                    <span className="text-[11px] text-ink-muted italic block pt-4 text-center">
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

      {/* Create Event / All-Day Modal */}
      <CreateEventModal
        isOpen={isCreateEventOpen}
        onClose={() => setIsCreateEventOpen(false)}
        defaultDate={selectedDate}
        defaultIsAllDay={true}
        onCreated={(createdTitle, createdDate) => {
          try {
            setSelectedDate(parseISO(`${createdDate}T00:00:00`));
          } catch {}
        }}
      />
    </div>
  );
}
