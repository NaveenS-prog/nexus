"use client";

import { useState, useEffect } from "react";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  CheckCircle, 
  Music, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Link2
} from "lucide-react";
import { useNexusStore } from "@/lib/data/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const CURATED_SPOTIFY_PLAYLISTS = [
  { id: "37i9dQZF1DWZeKCadgRdKQ", label: "Deep Focus", type: "playlist" },
  { id: "37i9dQZF1DXdLEN7aqioXM", label: "Lofi Beats", type: "playlist" },
  { id: "37i9dQZF1DX4sWSpwq3LiO", label: "Peaceful Piano", type: "playlist" },
  { id: "37i9dQZF1DX8Uebhn9wzrS", label: "Chill Lofi Study", type: "playlist" },
];

export default function FocusPage() {
  const { items, addFocusSession } = useNexusStore();
  
  // Timer state
  const [selectedDuration, setSelectedDuration] = useState<number>(45);
  const [timeLeft, setTimeLeft] = useState<number>(45 * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string>(items[1]?.id || "");
  
  // Spotify integration state
  const [spotifyEmbedId, setSpotifyEmbedId] = useState<string>("37i9dQZF1DWZeKCadgRdKQ");
  const [spotifyType, setSpotifyType] = useState<string>("playlist");
  const [customSpotifyUrl, setCustomSpotifyUrl] = useState<string>("");
  const [showCustomInput, setShowCustomInput] = useState<boolean>(false);
  const [isPlayerExpanded, setIsPlayerExpanded] = useState<boolean>(true);

  const selectedTask = items.find((i) => i.id === selectedTaskId) || items[1] || items[0];

  // Load saved Spotify playlist preference from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("nexus_spotify_playlist_id");
      const savedType = localStorage.getItem("nexus_spotify_playlist_type");
      if (saved) {
        setSpotifyEmbedId(saved);
        if (savedType) setSpotifyType(savedType);
      }
    }
  }, []);

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

  // Start timer in complete silence (Focus sound removed per request)
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
      ambientSound: "none",
    });

    alert("🎉 Focus session logged successfully!");
    setTimeLeft(selectedDuration * 60);
  };

  const handleSelectCurated = (id: string, type: string) => {
    setSpotifyEmbedId(id);
    setSpotifyType(type);
    if (typeof window !== "undefined") {
      localStorage.setItem("nexus_spotify_playlist_id", id);
      localStorage.setItem("nexus_spotify_playlist_type", type);
    }
  };

  const handleApplyCustomUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customSpotifyUrl.trim()) return;

    // Parse Spotify URL: https://open.spotify.com/(playlist|album|track)/<id>
    const match = customSpotifyUrl.match(/open\.spotify\.com\/(playlist|album|track)\/([a-zA-Z0-9]+)/i);
    if (match && match[1] && match[2]) {
      const type = match[1];
      const id = match[2];
      setSpotifyType(type);
      setSpotifyEmbedId(id);
      if (typeof window !== "undefined") {
        localStorage.setItem("nexus_spotify_playlist_id", id);
        localStorage.setItem("nexus_spotify_playlist_type", type);
      }
      setShowCustomInput(false);
      setCustomSpotifyUrl("");
    } else {
      alert("Please enter a valid Spotify playlist, album, or track URL.");
    }
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
        <h1 className="text-xl sm:text-2xl font-bold text-zinc-950">
          {selectedTask ? selectedTask.title : "General Focus Session"}
        </h1>
        <div className="flex items-center justify-center gap-2 text-xs text-zinc-500">
          <span>Task target:</span>
          <select
            value={selectedTaskId}
            onChange={(e) => setSelectedTaskId(e.target.value)}
            className="bg-white border border-zinc-200 rounded px-2 py-1 text-xs text-zinc-800 outline-none shadow-2xs font-medium"
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
        <div className="text-7xl sm:text-9xl font-extrabold font-mono tracking-tighter text-zinc-950 select-none drop-shadow-xs">
          {formatDisplayTime()}
        </div>

        {/* Duration Preset Selector */}
        <div className="flex items-center gap-2 bg-zinc-100/90 border border-zinc-200/90 p-1 rounded-lg text-xs">
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
                  ? "bg-zinc-950 text-white font-semibold shadow-xs"
                  : "text-zinc-600 hover:text-zinc-950 hover:bg-zinc-200/60"
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
          className="text-xs h-11 px-5 border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50 hover:border-zinc-300"
        >
          <RotateCcw className="w-4 h-4 mr-2 text-zinc-600" />
          Reset
        </Button>

        {isRunning ? (
          <Button
            size="lg"
            onClick={handlePauseTimer}
            className="text-sm h-11 px-8 bg-zinc-100 border border-zinc-200 text-zinc-950 hover:bg-zinc-200 font-semibold shadow-xs"
          >
            <Pause className="w-4 h-4 mr-2" />
            Pause
          </Button>
        ) : (
          <Button
            size="lg"
            onClick={handleStartTimer}
            className="text-sm h-11 px-8 bg-zinc-950 text-white font-semibold hover:bg-zinc-800 shadow-md"
          >
            <Play className="w-4 h-4 mr-2 fill-current" />
            Start Focus
          </Button>
        )}

        <Button
          variant="secondary"
          size="lg"
          onClick={handleFinishSession}
          className="text-xs h-11 px-5 border border-zinc-200 text-zinc-700 bg-zinc-50 hover:bg-zinc-100"
        >
          <CheckCircle className="w-4 h-4 mr-2 text-zinc-950" />
          Finish Early
        </Button>
      </div>

      {/* Spotify Focus Station */}
      <div className="w-full max-w-lg p-5 rounded-2xl border border-zinc-200/90 bg-white/90 backdrop-blur-md shadow-[0_1px_3px_rgba(0,0,0,0.03),0_8px_24px_rgba(0,0,0,0.02)] space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-950">
            <div className="p-1 rounded bg-[#1DB954] text-white">
              <Music className="w-3.5 h-3.5" />
            </div>
            <span>Spotify Focus Audio</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCustomInput(!showCustomInput)}
              className="px-2 py-1 rounded text-[11px] font-medium border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 flex items-center gap-1 transition-colors"
            >
              <Link2 className="w-3 h-3" />
              <span>Custom URL</span>
            </button>
            <button
              onClick={() => setIsPlayerExpanded(!isPlayerExpanded)}
              className="p-1 rounded text-zinc-400 hover:text-zinc-950 transition-colors"
            >
              {isPlayerExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Custom Spotify URL Input Drawer */}
        {showCustomInput && (
          <form onSubmit={handleApplyCustomUrl} className="p-3 rounded-lg bg-zinc-50 border border-zinc-200 space-y-2">
            <div className="text-[11px] text-zinc-600 font-medium">
              Paste your personal Spotify playlist, album, or track URL:
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={customSpotifyUrl}
                onChange={(e) => setCustomSpotifyUrl(e.target.value)}
                placeholder="https://open.spotify.com/playlist/..."
                className="flex-1 bg-white border border-zinc-200 rounded px-2.5 py-1.5 text-xs text-zinc-900 placeholder-zinc-400 outline-none focus:border-zinc-950 shadow-2xs font-mono"
              />
              <Button type="submit" size="sm" className="text-xs h-8 bg-zinc-950 text-white hover:bg-zinc-800">
                Load
              </Button>
            </div>
          </form>
        )}

        {/* Curated Focus Mixes Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {CURATED_SPOTIFY_PLAYLISTS.map((pl) => {
            const isSelected = spotifyEmbedId === pl.id;
            return (
              <button
                key={pl.id}
                onClick={() => handleSelectCurated(pl.id, pl.type)}
                className={`px-2.5 py-1 rounded-md border text-xs whitespace-nowrap transition-all ${
                  isSelected
                    ? "bg-zinc-950 text-white border-zinc-950 font-semibold shadow-2xs"
                    : "bg-zinc-50 border-zinc-200 text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100"
                }`}
              >
                {pl.label}
              </button>
            );
          })}
        </div>

        {/* Embedded Spotify Player */}
        {isPlayerExpanded && (
          <div className="rounded-xl overflow-hidden border border-zinc-200 shadow-xs bg-zinc-950">
            <iframe
              src={`https://open.spotify.com/embed/${spotifyType}/${spotifyEmbedId}?utm_source=generator&theme=0`}
              width="100%"
              height="152"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              className="border-0 rounded-xl"
            />
          </div>
        )}

        <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1">
          <span>Plays seamlessly in your browser while focusing</span>
          <a
            href={`https://open.spotify.com/${spotifyType}/${spotifyEmbedId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-zinc-800 flex items-center gap-1 text-zinc-500 font-medium"
          >
            <span>Open in App</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
