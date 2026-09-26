"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Play, Pause, RotateCcw, CheckCircle2 } from "lucide-react";
import { useNexusStore } from "@/lib/data/store";
import { Button } from "@/components/ui/button";
import { recommendNextTask } from "@/lib/engines/recommendation";
import { isActionableTaskOrAssignment } from "@/lib/nlp/itemClassifier";
import { cn } from "@/components/ui/badge";

export default function FocusPage() {
  const { items, toggleItemCompletion } = useNexusStore();
  
  // Timer state: 25 minutes default (Pomodoro / Focus session)
  const [totalSeconds, setTotalSeconds] = useState(25 * 60);
  const [secondsRemaining, setSecondsRemaining] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [activeSessionCount, setActiveSessionCount] = useState(0);

  // Focus Task
  const actionableTasks = useMemo(() => items.filter(isActionableTaskOrAssignment), [items]);
  const defaultTask = useMemo(() => {
    const rec = recommendNextTask(items, "default", new Date());
    return rec?.item || actionableTasks.find((i) => i.status !== "completed") || null;
  }, [items, actionableTasks]);

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const activeTask = useMemo(() => {
    if (selectedTaskId) {
      return items.find((i) => i.id === selectedTaskId) || defaultTask;
    }
    return defaultTask;
  }, [selectedTaskId, items, defaultTask]);

  // Timer interval
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRunning && secondsRemaining > 0) {
      interval = setInterval(() => {
        setSecondsRemaining((prev) => prev - 1);
      }, 1000);
    } else if (secondsRemaining === 0 && isRunning) {
      setIsRunning(false);
      setActiveSessionCount((prev) => prev + 1);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, secondsRemaining]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const handleReset = (durationMins: number = 25) => {
    setIsRunning(false);
    setTotalSeconds(durationMins * 60);
    setSecondsRemaining(durationMins * 60);
  };

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col justify-between p-8 sm:p-14 animate-fade-in font-sans select-none">
      {/* Top Bar: Quiet Exit */}
      <div className="flex items-center justify-between">
        <Link 
          href="/" 
          className="text-xs font-mono text-ink-muted hover:text-ink transition-colors flex items-center gap-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Exit Focus</span>
        </Link>

        <div className="text-[11px] font-mono text-ink-muted">
          Session {activeSessionCount + 1} · Deep Work
        </div>
      </div>

      {/* Main Focus Center */}
      <div className="max-w-xl mx-auto w-full text-center space-y-10 my-auto py-12">
        {/* Current Task Display */}
        <div className="space-y-2">
          <span className="text-[10px] uppercase font-mono tracking-widest text-ink-muted block">
            Current Focus
          </span>
          {activeTask ? (
            <h1 className="font-editorial text-2xl sm:text-3xl text-ink font-normal leading-snug tracking-tight">
              {activeTask.title}
            </h1>
          ) : (
            <h1 className="font-editorial text-2xl sm:text-3xl text-ink-muted font-normal">
              Open Focus Space
            </h1>
          )}
          {activeTask?.courseName && (
            <p className="text-xs text-ink-secondary font-mono">
              {activeTask.courseName}
            </p>
          )}
        </div>

        {/* Large Zen Timer */}
        <div className="py-4">
          <div className="font-editorial text-7xl sm:text-8xl tracking-tight text-ink tabular-nums font-normal select-none">
            {formatTime(secondsRemaining)}
          </div>
        </div>

        {/* Timer Controls */}
        <div className="flex items-center justify-center gap-3">
          <Button
            variant={isRunning ? "outline" : "olive"}
            size="lg"
            onClick={() => setIsRunning(!isRunning)}
            className="h-10 px-6 flex items-center gap-2"
          >
            {isRunning ? (
              <>
                <Pause className="w-4 h-4" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Begin</span>
              </>
            )}
          </Button>

          <Button
            variant="outline"
            size="lg"
            onClick={() => handleReset(25)}
            className="h-10 px-4 text-ink-muted hover:text-ink"
            title="Reset to 25m"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>

          {activeTask && activeTask.status !== "completed" && (
            <Button
              variant="outline"
              size="lg"
              onClick={() => toggleItemCompletion(activeTask.id)}
              className="h-10 px-4 text-ink-secondary hover:text-olive"
              title="Mark Task Completed"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span className="hidden sm:inline ml-1.5 text-xs">Done</span>
            </Button>
          )}
        </div>

        {/* Duration Selectors */}
        <div className="flex items-center justify-center gap-2 pt-4">
          {[
            { label: "15m", mins: 15 },
            { label: "25m", mins: 25 },
            { label: "45m", mins: 45 },
            { label: "60m", mins: 60 },
          ].map((dur) => (
            <button
              key={dur.label}
              onClick={() => handleReset(dur.mins)}
              className={cn(
                "px-2.5 py-1 text-[11px] font-mono rounded-sm transition-colors",
                totalSeconds === dur.mins * 60
                  ? "bg-canvas-secondary text-ink font-medium border border-hairline"
                  : "text-ink-muted hover:text-ink"
              )}
            >
              {dur.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Footer Note */}
      <div className="text-center text-[11px] font-mono text-ink-muted">
        Silence all notifications. Single-task until the bell tolls.
      </div>
    </div>
  );
}
