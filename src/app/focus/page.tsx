"use client";

import { useState, useEffect } from "react";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  CheckCircle, 
  Sparkles
} from "lucide-react";
import { useNexusStore } from "@/lib/data/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function FocusPage() {
  const { items, addFocusSession } = useNexusStore();
  
  // Timer state
  const [selectedDuration, setSelectedDuration] = useState<number>(45); // in minutes
  const [timeLeft, setTimeLeft] = useState<number>(45 * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string>(items[1]?.id || "");

  const selectedTask = items.find((i) => i.id === selectedTaskId) || items[1] || items[0];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      setIsRunning(false);
      handleFinishSession();
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  const handleStartTimer = () => {
    setIsRunning(true);
  };

  const handlePauseTimer = () => {
    setIsRunning(false);
  };

  const handleResetTimer = () => {
    setIsRunning(false);
    setTimeLeft(selectedDuration * 60);
  };

  const handleSelectDuration = (minutes: number) => {
    setSelectedDuration(minutes);
    setTimeLeft(minutes * 60);
    setIsRunning(false);
  };

  const handleFinishSession = () => {
    setIsRunning(false);

    addFocusSession({
      title: selectedTask ? selectedTask.title : "Unspecified Focus Sprint",
      taskId: selectedTask?.id,
      projectId: selectedTask?.projectId,
      durationMinutes: selectedDuration,
      startedAt: new Date(Date.now() - selectedDuration * 60000).toISOString(),
      endedAt: new Date().toISOString(),
      completed: true,
    });

    alert("🎉 Focus session logged successfully!");
    setTimeLeft(selectedDuration * 60);
  };

  // Format MM:SS
  const formatDisplayTime = () => {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 flex flex-col items-center justify-center space-y-10 animate-fade-in">
      {/* Session Title Header */}
      <div className="text-center space-y-2">
        <span className="text-xs font-mono font-bold tracking-widest text-zinc-400 uppercase">
          DEEP FOCUS CHAMBER
        </span>
        <h1 className="text-xl sm:text-2xl font-bold text-white">
          {selectedTask ? selectedTask.title : "General Focus Session"}
        </h1>
        <div className="flex items-center justify-center gap-2 text-xs text-zinc-400">
          <span>Task target:</span>
          <select
            value={selectedTaskId}
            onChange={(e) => setSelectedTaskId(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 rounded px-2 py-0.5 text-xs text-zinc-200 outline-none"
          >
            {items
              .filter((i) => i.status !== "completed")
              .map((i) => (
                <option key={i.id} value={i.id}>
                  {i.title}
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* Big Digital Countdown Clock */}
      <div className="flex flex-col items-center space-y-4">
        <div className="text-7xl sm:text-9xl font-extrabold font-mono tracking-tighter text-white select-none drop-shadow-2xl">
          {formatDisplayTime()}
        </div>

        {/* Duration Preset Selector */}
        <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 p-1 rounded-lg text-xs">
          {[
            { label: "25m Pomodoro", value: 25 },
            { label: "45m Deep Work", value: 45 },
            { label: "60m Sprint", value: 60 },
          ].map((preset) => (
            <button
              key={preset.value}
              onClick={() => handleSelectDuration(preset.value)}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                selectedDuration === preset.value
                  ? "bg-white text-black font-semibold shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Timer Controls */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="lg"
          onClick={handleResetTimer}
          className="text-xs h-11 px-5 border-zinc-700 hover:border-white"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset
        </Button>

        {isRunning ? (
          <Button
            size="lg"
            onClick={handlePauseTimer}
            className="text-sm h-11 px-8 bg-zinc-900 border border-zinc-700 text-white hover:bg-zinc-800 font-semibold"
          >
            <Pause className="w-4 h-4 mr-2" />
            Pause
          </Button>
        ) : (
          <Button
            size="lg"
            onClick={handleStartTimer}
            className="text-sm h-11 px-8 bg-white text-black font-semibold hover:bg-zinc-200 shadow-md"
          >
            <Play className="w-4 h-4 mr-2 fill-current" />
            Start Focus
          </Button>
        )}

        <Button
          variant="secondary"
          size="lg"
          onClick={handleFinishSession}
          className="text-xs h-11 px-5"
        >
          <CheckCircle className="w-4 h-4 mr-2 text-white" />
          Finish Early
        </Button>
      </div>
    </div>
  );
}
