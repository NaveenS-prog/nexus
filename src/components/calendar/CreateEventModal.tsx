"use client";

import { useState, useEffect } from "react";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  X, 
  Plus, 
  Check, 
  GraduationCap, 
  Sparkles, 
  Tag, 
  AlertCircle 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNexusStore } from "@/lib/data/store";
import { format, parseISO } from "date-fns";
import { isExamItem } from "@/lib/nlp/itemClassifier";
import { Priority, Category } from "@/lib/types";

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDate?: Date;
  defaultIsAllDay?: boolean;
  onCreated?: (title: string, date: string) => void;
}

export function CreateEventModal({
  isOpen,
  onClose,
  defaultDate,
  defaultIsAllDay = true,
  onCreated,
}: CreateEventModalProps) {
  const { addItem } = useNexusStore();

  const [title, setTitle] = useState("");
  const [dateStr, setDateStr] = useState(format(defaultDate || new Date(), "yyyy-MM-dd"));
  const [isAllDay, setIsAllDay] = useState(defaultIsAllDay);
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("11:30");
  const [priority, setPriority] = useState<Priority>("medium");
  const [category, setCategory] = useState<Category>("calendar");
  const [description, setDescription] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  // Sync date when defaultDate prop changes
  useEffect(() => {
    if (defaultDate) {
      setDateStr(format(defaultDate, "yyyy-MM-dd"));
    }
  }, [defaultDate]);

  // Auto-detect exam / IA signals from title
  const isDetectedExam = isExamItem({ title });

  useEffect(() => {
    if (isDetectedExam) {
      setPriority("critical");
      setCategory("academic");
    }
  }, [isDetectedExam]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !dateStr) return;

    const trimmedTitle = title.trim();
    const isExam = isExamItem({ title: trimmedTitle });

    let startAt: string;
    let dueAt: string;
    let estimatedMinutes: number;

    if (isAllDay) {
      startAt = `${dateStr}T00:00:00`;
      dueAt = `${dateStr}T23:59:59`;
      estimatedMinutes = isExam ? 90 : 480;
    } else {
      startAt = `${dateStr}T${startTime}:00`;
      dueAt = `${dateStr}T${endTime}:00`;
      try {
        const s = parseISO(startAt);
        const e = parseISO(dueAt);
        const diff = Math.max(15, Math.round((e.getTime() - s.getTime()) / 60000));
        estimatedMinutes = diff;
      } catch {
        estimatedMinutes = 60;
      }
    }

    const tags: string[] = ["Calendar"];
    if (isAllDay) tags.push("All Day");
    if (isExam) tags.push("Exam");

    addItem({
      source: "google_calendar",
      title: trimmedTitle,
      category: isExam ? "academic" : category,
      priority: isExam ? "critical" : priority,
      status: "pending",
      startAt,
      dueAt,
      estimatedMinutes,
      tags,
      description: description.trim() || undefined,
      metadata: {
        isAllDay,
      },
    });

    setFeedback(`✓ Created ${isAllDay ? "all-day event" : "event"} "${trimmedTitle}" for ${dateStr}`);
    if (onCreated) {
      onCreated(trimmedTitle, dateStr);
    }

    setTimeout(() => {
      setFeedback(null);
      setTitle("");
      setDescription("");
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-ink/25 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div 
        className="bg-surface border border-hairline rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl space-y-0 text-ink"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-hairline">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-olive text-white">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-serif font-semibold text-ink tracking-tight">
                {isAllDay ? "Add All-Day Event" : "Schedule Event"}
              </h2>
              <p className="text-xs text-ink-muted">
                Create an exam, deadline, or full-day calendar milestone
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-canvas-secondary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Event Title */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-ink">
                Event Title <span className="text-terracotta">*</span>
              </label>
              {isDetectedExam && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-terracotta-light/30 text-terracotta border border-terracotta/20 font-bold flex items-center gap-1">
                  <GraduationCap className="w-3 h-3" />
                  EXAM DETECTED
                </span>
              )}
            </div>
            <input
              type="text"
              required
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Python ia exam, COA IA-2, Hackathon Day"
              className="w-full bg-canvas border border-hairline rounded-lg px-3.5 py-2 text-xs text-ink placeholder-ink-muted outline-none focus:border-olive transition-colors font-sans"
            />
          </div>

          {/* Date & All-Day Toggle */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-end">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink">
                Date <span className="text-terracotta">*</span>
              </label>
              <input
                type="date"
                required
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                className="w-full bg-canvas border border-hairline rounded-lg px-3 py-2 text-xs text-ink outline-none focus:border-olive font-mono"
              />
            </div>

            {/* All-Day Checkbox / Toggle */}
            <label className="flex items-center gap-2.5 p-2 rounded-lg bg-canvas border border-hairline cursor-pointer hover:border-olive/40 transition-colors h-[38px]">
              <input
                type="checkbox"
                checked={isAllDay}
                onChange={(e) => setIsAllDay(e.target.checked)}
                className="w-4 h-4 rounded border-hairline text-olive accent-olive cursor-pointer"
              />
              <span className="text-xs font-medium text-ink select-none">
                All-Day Event
              </span>
            </label>
          </div>

          {/* Timed Inputs (if not all day) */}
          {!isAllDay && (
            <div className="grid grid-cols-2 gap-3.5 p-3 rounded-lg bg-canvas-secondary/50 border border-hairline animate-fade-in">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-ink-muted">Start Time</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full bg-surface border border-hairline rounded-md px-2.5 py-1.5 text-xs text-ink font-mono outline-none focus:border-olive"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-ink-muted">End Time</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full bg-surface border border-hairline rounded-md px-2.5 py-1.5 text-xs text-ink font-mono outline-none focus:border-olive"
                />
              </div>
            </div>
          )}

          {/* Category & Priority */}
          <div className="grid grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                className="w-full bg-canvas border border-hairline rounded-lg px-3 py-2 text-xs text-ink outline-none focus:border-olive"
              >
                <option value="academic">Academic / Exam</option>
                <option value="calendar">General Calendar</option>
                <option value="personal">Personal Milestone</option>
                <option value="project">Project Deadline</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full bg-canvas border border-hairline rounded-lg px-3 py-2 text-xs text-ink outline-none focus:border-olive"
              >
                <option value="critical">Critical (Exams, Key Deadlines)</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          {/* Description / Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-ink">
              Notes / Location <span className="text-ink-muted font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Hall 102, Syllabus: Units 1-3"
              className="w-full bg-canvas border border-hairline rounded-lg px-3.5 py-2 text-xs text-ink placeholder-ink-muted outline-none focus:border-olive"
            />
          </div>

          {/* Feedback Message */}
          {feedback && (
            <div className="p-2.5 rounded-lg bg-olive-light/30 border border-olive/30 text-xs text-olive font-mono flex items-center gap-2 animate-fade-in">
              <Check className="w-4 h-4 text-olive" />
              <span>{feedback}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-hairline">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-8 text-xs border-hairline text-ink-muted hover:text-ink"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!title.trim() || !dateStr || Boolean(feedback)}
              className="h-8 text-xs bg-olive hover:bg-olive-hover text-white font-medium"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              {isAllDay ? "Add All-Day Event" : "Create Event"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
