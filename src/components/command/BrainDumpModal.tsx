"use client";

import { useState } from "react";
import { Sparkles, Check, ArrowRight, Lightbulb, CheckSquare, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNexusStore } from "@/lib/data/store";
import { ParsedDumpItem } from "@/lib/types";

interface BrainDumpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BrainDumpModal({ isOpen, onClose }: BrainDumpModalProps) {
  const { addItem } = useNexusStore();
  const [inputText, setInputText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [parsedItems, setParsedItems] = useState<ParsedDumpItem[] | null>(null);

  if (!isOpen) return null;

  // Intelligent heuristic parser with structured pattern recognition
  const handleParse = async () => {
    if (!inputText.trim()) return;
    setIsAnalyzing(true);

    // Call server AI route or heuristic fallback
    try {
      const res = await fetch("/api/ai/brain-dump", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: inputText }),
      });
      if (res.ok) {
        const data = await res.json();
        setParsedItems(data.items);
        setIsAnalyzing(false);
        return;
      }
    } catch {
      // fallback to heuristic parser
    }

    // Heuristic client-side parser fallback
    const rawChunks = inputText
      .split(/(?:,|\band\b|\n|\.)/gi)
      .map((s) => s.trim())
      .filter((s) => s.length > 3);

    const items: ParsedDumpItem[] = rawChunks.map((chunk, idx) => {
      const lower = chunk.toLowerCase();
      const isIdea = lower.includes("idea") || lower.includes("build a") || lower.includes("create an");
      const isAcademic = lower.includes("assignment") || lower.includes("exam") || lower.includes("professor") || lower.includes("class");

      let cleanTitle = chunk
        .replace(/^(need to|have to|i have an idea for|idea for|remember to)\s+/i, "")
        .trim();
      cleanTitle = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);

      return {
        id: `parsed-${idx}`,
        title: cleanTitle,
        type: isIdea ? "idea" : "task",
        targetDestination: isIdea ? "notion" : isAcademic ? "google_tasks" : "nexus",
        category: isIdea ? "idea" : isAcademic ? "academic" : "personal",
        priority: isAcademic ? "high" : "medium",
        estimatedMinutes: isIdea ? 60 : 30,
      };
    });

    setTimeout(() => {
      setParsedItems(items);
      setIsAnalyzing(false);
    }, 400);
  };

  const handleSaveAll = () => {
    if (!parsedItems) return;
    parsedItems.forEach((p) => {
      addItem({
        source: p.targetDestination,
        title: p.title,
        category: p.category,
        priority: p.priority,
        status: "pending",
        estimatedMinutes: p.estimatedMinutes,
        tags: [p.type === "idea" ? "Idea" : "Quick Capture"],
      });
    });

    setInputText("");
    setParsedItems(null);
    onClose();
  };

  const handleRemoveParsedItem = (id: string) => {
    if (!parsedItems) return;
    setParsedItems(parsedItems.filter((i) => i.id !== id));
  };

  const samplePrompt = "Need to finish java assignment tomorrow, buy a mouse, ask professor about attendance, and I have an idea for an AI resume analyzer.";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/25 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl bg-surface border border-hairline rounded-xl shadow-2xl overflow-hidden flex flex-col text-ink">
        {/* Header */}
        <div className="px-5 py-4 border-b border-hairline flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-olive text-white">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-serif font-semibold text-ink">Quick Capture & Notes</h2>
              <p className="text-xs text-ink-muted">Stream your unstructured thoughts — NEXUS parses tasks & ideas</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 text-ink-muted hover:text-ink rounded-md hover:bg-canvas-secondary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          {!parsedItems ? (
            <>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type everything on your mind... e.g. 'Finish OS assignment tonight, buy coffee, and an idea for an AI resume analyzer'"
                rows={4}
                className="w-full bg-canvas border border-hairline rounded-lg p-3 text-xs text-ink placeholder-ink-muted outline-none focus:border-olive resize-none font-sans leading-relaxed"
                autoFocus
              />

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setInputText(samplePrompt)}
                  className="text-[11px] text-ink-muted hover:text-ink underline"
                >
                  Load sample notes
                </button>

                <Button
                  onClick={handleParse}
                  disabled={!inputText.trim() || isAnalyzing}
                  className="flex items-center gap-1.5 text-xs h-8 bg-olive hover:bg-olive-hover text-white font-medium"
                >
                  {isAnalyzing ? (
                    <span>Parsing thoughts...</span>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Parse Notes</span>
                    </>
                  )}
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-ink">
                  Detected {parsedItems.length} structured items:
                </span>
                <button
                  onClick={() => setParsedItems(null)}
                  className="text-[11px] text-ink-muted hover:text-ink underline"
                >
                  Edit original text
                </button>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {parsedItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-lg bg-surface border border-hairline flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {item.type === "idea" ? (
                        <div className="p-1 rounded bg-canvas-secondary text-ink-secondary">
                          <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
                        </div>
                      ) : (
                        <div className="p-1 rounded bg-canvas-secondary text-ink-secondary">
                          <CheckSquare className="w-3.5 h-3.5 text-olive" />
                        </div>
                      )}
                      <div className="truncate">
                        <p className="text-ink font-medium truncate">{item.title}</p>
                        <div className="flex items-center gap-2 text-[10px] text-ink-muted mt-0.5 font-mono">
                          <span className="uppercase">{item.type}</span>
                          <span>•</span>
                          <span className="capitalize">{item.category}</span>
                          <span>•</span>
                          <span>Est. {item.estimatedMinutes}m</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant="outline">
                        → {item.targetDestination === "google_tasks" ? "Google Tasks" : item.targetDestination === "notion" ? "Notion" : "NEXUS"}
                      </Badge>
                      <button
                        onClick={() => handleRemoveParsedItem(item.id)}
                        className="p-1 text-ink-muted hover:text-ink transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-hairline flex items-center justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setParsedItems(null)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSaveAll} className="flex items-center gap-1.5 bg-olive hover:bg-olive-hover text-white font-medium">
                  <Check className="w-3.5 h-3.5" />
                  <span>Add Everything ({parsedItems.length})</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
