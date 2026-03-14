import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { Timer, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RestTimerContextType {
  startTimer: (seconds?: number) => void;
}

const RestTimerContext = createContext<RestTimerContextType | null>(null);

export function useRestTimer() {
  const ctx = useContext(RestTimerContext);
  if (!ctx) throw new Error("useRestTimer must be inside RestTimerProvider");
  return ctx;
}

const PRESETS = [60, 90, 120];

export function RestTimerProvider({ children }: { children: React.ReactNode }) {
  const [remaining, setRemaining] = useState<number | null>(null);
  const [totalTime, setTotalTime] = useState(90);
  const [showPicker, setShowPicker] = useState(false);
  const [customSeconds, setCustomSeconds] = useState(90);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setRemaining(null);
    setShowPicker(false);
  }, []);

  const startTimer = useCallback((seconds?: number) => {
    if (seconds) {
      // Direct start with specified duration
      setTotalTime(seconds);
      setRemaining(seconds);
      setShowPicker(false);
    } else {
      // Show picker
      setShowPicker(true);
    }
  }, []);

  const startWithDuration = useCallback((seconds: number) => {
    setTotalTime(seconds);
    setCustomSeconds(seconds);
    setRemaining(seconds);
    setShowPicker(false);
  }, []);

  useEffect(() => {
    if (remaining === null) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    if (remaining <= 0) {
      clearTimer();
      return;
    }
    intervalRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev === null || prev <= 1) return null;
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [remaining !== null ? "active" : "inactive"]);

  // Separate effect for countdown
  useEffect(() => {
    if (remaining === null) return;
    if (remaining <= 0) {
      clearTimer();
    }
  }, [remaining, clearTimer]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const pct = remaining !== null ? (remaining / totalTime) * 100 : 0;

  return (
    <RestTimerContext.Provider value={{ startTimer }}>
      {children}

      {/* Duration picker modal */}
      {showPicker && remaining === null && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[60] bg-card border border-border rounded-xl shadow-lg p-4 w-72" data-testid="rest-timer-picker">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold flex items-center gap-1.5">
              <Timer className="w-4 h-4" /> Rest Timer
            </span>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setShowPicker(false)}>
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
          <div className="flex gap-2 mb-3">
            {PRESETS.map(s => (
              <Button
                key={s}
                variant="outline"
                size="sm"
                className="flex-1 text-xs h-8"
                onClick={() => startWithDuration(s)}
                data-testid={`rest-preset-${s}`}
              >
                {formatTime(s)}
              </Button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              min={10}
              max={600}
              value={customSeconds}
              onChange={e => setCustomSeconds(Math.max(10, Number(e.target.value)))}
              className="flex-1 h-8 px-2 text-xs rounded-md border border-input bg-background"
              placeholder="Custom (sec)"
              data-testid="rest-custom-input"
            />
            <Button size="sm" className="h-8 text-xs" onClick={() => startWithDuration(customSeconds)} data-testid="rest-custom-start">
              Start
            </Button>
          </div>
        </div>
      )}

      {/* Active timer pill */}
      {remaining !== null && remaining > 0 && (
        <div
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 bg-card border border-border rounded-full shadow-lg px-4 py-2"
          data-testid="rest-timer-active"
        >
          <Timer className="w-4 h-4 text-primary" />
          <div className="flex flex-col items-center">
            <span className="text-sm font-bold tabular-nums">{formatTime(remaining)}</span>
            <div className="w-16 h-1 bg-muted rounded-full overflow-hidden mt-0.5">
              <div
                className="h-full bg-primary rounded-full transition-all duration-1000"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={clearTimer} data-testid="rest-timer-dismiss">
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}
    </RestTimerContext.Provider>
  );
}
