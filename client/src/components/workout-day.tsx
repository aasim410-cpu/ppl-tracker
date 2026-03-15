import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { useRestTimer } from "@/components/rest-timer";
import { CalendarIcon, Play, Plus, Trash2, Weight, Repeat, Layers, Gauge, Pencil, Check, X, ChevronDown, ChevronUp, RefreshCw, StickyNote, Timer, AlertTriangle } from "lucide-react";
import { useUnit } from "@/lib/unit";
import type { Exercise, WorkoutLog } from "@shared/schema";

interface WorkoutDayProps {
  dayType: "push" | "pull" | "legs";
  title: string;
  subtitle: string;
  exercises: Exercise[];
  accentClass: string;
  accentBg: string;
}

function ExerciseVideoDialog({ exercise }: { exercise: Exercise }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-7 px-2" data-testid={`video-${exercise.id}`}>
          <Play className="w-3 h-3" />
          How-to
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-base">{exercise.name}</DialogTitle>
        </DialogHeader>
        <div className="aspect-video w-full rounded-lg overflow-hidden bg-muted">
          <iframe
            src={`https://www.youtube.com/embed/${exercise.videoId}`}
            title={exercise.name}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditLogInline({
  log,
  date,
  onDone,
}: {
  log: WorkoutLog;
  date: string;
  onDone: () => void;
}) {
  const { displayWeight, toKg, unitLabel } = useUnit();
  const [sets, setSets] = useState(log.sets);
  const [reps, setReps] = useState(log.reps);
  const [weight, setWeight] = useState(displayWeight(log.weight));
  const [rpe, setRpe] = useState(log.rpe);
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PUT", `/api/logs/${log.id}`, { sets, reps, weight: toKg(weight), rpe });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/logs/date", date] });
      toast({ title: "Updated", description: "Log entry updated." });
      onDone();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update.", variant: "destructive" });
    },
  });

  return (
    <div className="flex items-center gap-1.5 flex-wrap" data-testid={`edit-inline-${log.id}`}>
      <Input type="number" min={1} max={20} value={sets} onChange={e => setSets(Number(e.target.value))} className="h-7 w-14 text-xs px-1.5" data-testid={`edit-sets-${log.id}`} />
      <span className="text-xs text-muted-foreground">×</span>
      <Input type="number" min={1} max={100} value={reps} onChange={e => setReps(Number(e.target.value))} className="h-7 w-14 text-xs px-1.5" data-testid={`edit-reps-${log.id}`} />
      <span className="text-xs text-muted-foreground">@</span>
      <Input type="number" min={0} step={2.5} value={weight} onChange={e => setWeight(Number(e.target.value))} className="h-7 w-16 text-xs px-1.5" data-testid={`edit-weight-${log.id}`} />
      <span className="text-xs text-muted-foreground">{unitLabel} RPE</span>
      <Input type="number" min={1} max={10} value={rpe} onChange={e => setRpe(Number(e.target.value))} className="h-7 w-12 text-xs px-1.5" data-testid={`edit-rpe-${log.id}`} />
      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-emerald-500" onClick={() => mutation.mutate()} disabled={mutation.isPending} data-testid={`edit-save-${log.id}`}>
        <Check className="w-3 h-3" />
      </Button>
      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground" onClick={onDone} data-testid={`edit-cancel-${log.id}`}>
        <X className="w-3 h-3" />
      </Button>
    </div>
  );
}

function LogEntryForm({
  exercise,
  date,
  dayType,
  onSuccess,
}: {
  exercise: Exercise;
  date: string;
  dayType: string;
  onSuccess: () => void;
}) {
  // Fetch last log for pre-filled defaults
  const { data: lastLog } = useQuery<WorkoutLog | null>({
    queryKey: ["/api/logs/last", exercise.id, date],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/logs/last/${exercise.id}?excludeDate=${date}`);
      return res.json();
    },
  });

  const { displayWeight, toKg, unitLabel } = useUnit();
  const [sets, setSets] = useState(3);
  const [reps, setReps] = useState(10);
  const [weight, setWeight] = useState(displayWeight(20));
  const [rpe, setRpe] = useState(7);
  const [defaultsApplied, setDefaultsApplied] = useState(false);
  const { toast } = useToast();
  const { startTimer } = useRestTimer();

  // Pre-fill from last log when data arrives
  useEffect(() => {
    if (lastLog && !defaultsApplied) {
      setSets(lastLog.sets);
      setReps(lastLog.reps);
      setWeight(displayWeight(lastLog.weight));
      setRpe(lastLog.rpe);
      setDefaultsApplied(true);
    }
  }, [lastLog, defaultsApplied]);

  const mutation = useMutation({
    mutationFn: async () => {
      const weightKg = toKg(weight);
      const res = await apiRequest("POST", "/api/logs", {
        date,
        dayType,
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        sets,
        reps,
        weight: weightKg,
        rpe,
      });
      return res.json();
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["/api/logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/logs/date", date] });
      toast({ title: "Logged", description: `${exercise.name} recorded.` });

      // Auto-start session timer on first log
      try {
        await apiRequest("POST", "/api/sessions/start", { date, dayType });
        queryClient.invalidateQueries({ queryKey: ["/api/sessions", date, dayType] });
      } catch {
        // Session may already exist, that's fine
      }

      // PR detection
      try {
        const prRes = await apiRequest("GET", `/api/logs/pr/${exercise.id}`);
        const prData = await prRes.json();
        const weightKg = toKg(weight);
        if (prData.maxWeight !== null && weightKg >= prData.maxWeight && weightKg > 0) {
          toast({
            title: "\u{1F3C6} New PR!",
            description: `${weight}${unitLabel} on ${exercise.name}`,
          });
        }
      } catch {
        // PR check is best-effort
      }

      // Trigger rest timer
      startTimer();
      onSuccess();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to log exercise.", variant: "destructive" });
    },
  });

  const rpeLabel = (v: number) => {
    if (v <= 3) return "Easy";
    if (v <= 5) return "Moderate";
    if (v <= 7) return "Hard";
    if (v <= 9) return "Very Hard";
    return "Maximal";
  };

  const rpeColor = (v: number) => {
    if (v <= 3) return "text-emerald-500";
    if (v <= 5) return "text-amber-500";
    if (v <= 7) return "text-orange-500";
    if (v <= 9) return "text-red-500";
    return "text-red-600";
  };

  return (
    <div className="space-y-4 pt-2">
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label className="text-xs text-muted-foreground flex items-center gap-1 mb-1.5">
            <Layers className="w-3 h-3" /> Sets
          </Label>
          <Input
            type="number"
            min={1}
            max={20}
            value={sets}
            onChange={(e) => setSets(Number(e.target.value))}
            className="h-9"
            data-testid={`input-sets-${exercise.id}`}
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground flex items-center gap-1 mb-1.5">
            <Repeat className="w-3 h-3" /> Reps
          </Label>
          <Input
            type="number"
            min={1}
            max={100}
            value={reps}
            onChange={(e) => setReps(Number(e.target.value))}
            className="h-9"
            data-testid={`input-reps-${exercise.id}`}
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground flex items-center gap-1 mb-1.5">
            <Weight className="w-3 h-3" /> Weight ({unitLabel})
          </Label>
          <Input
            type="number"
            min={0}
            step={2.5}
            value={weight}
            onChange={(e) => setWeight(Number(e.target.value))}
            className="h-9"
            data-testid={`input-weight-${exercise.id}`}
          />
        </div>
      </div>

      <div>
        <Label className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
          <Gauge className="w-3 h-3" /> RPE: <span className={`font-semibold ${rpeColor(rpe)}`}>{rpe} — {rpeLabel(rpe)}</span>
        </Label>
        <Slider
          value={[rpe]}
          onValueChange={(v) => setRpe(v[0])}
          min={1}
          max={10}
          step={1}
          className="w-full"
          data-testid={`slider-rpe-${exercise.id}`}
        />
        <div className="flex justify-between text-[10px] text-muted-foreground mt-1 px-0.5">
          <span>1</span><span>5</span><span>10</span>
        </div>
      </div>

      <Button
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending}
        className="w-full h-9"
        data-testid={`log-btn-${exercise.id}`}
      >
        {mutation.isPending ? "Logging..." : "Log Exercise"}
      </Button>
    </div>
  );
}

function ExerciseCard({
  exercise,
  date,
  dayType,
  logs,
  accentClass,
  accentBg,
}: {
  exercise: Exercise;
  date: string;
  dayType: string;
  logs: WorkoutLog[];
  accentClass: string;
  accentBg: string;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const exerciseLogs = logs.filter((l) => l.exerciseId === exercise.id);
  const { toast } = useToast();
  const { displayWeight, unitLabel } = useUnit();

  // Progressive overload: fetch last session data
  const { data: lastLog } = useQuery<WorkoutLog | null>({
    queryKey: ["/api/logs/last", exercise.id, date],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/logs/last/${exercise.id}?excludeDate=${date}`);
      return res.json();
    },
  });

  // Estimated 1RM
  const { data: e1rmData } = useQuery<{ e1rm: number | null }>({
    queryKey: ["/api/stats/e1rm-current", exercise.id],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/stats/e1rm-current/${exercise.id}`);
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/logs/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/logs/date", date] });
      toast({ title: "Deleted", description: "Log entry removed." });
    },
  });

  return (
    <Card className="p-4" data-testid={`exercise-card-${exercise.id}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="text-sm font-semibold truncate">{exercise.name}</h3>
            {e1rmData?.e1rm != null && (
              <span className="text-[10px] text-muted-foreground whitespace-nowrap" data-testid={`e1rm-${exercise.id}`}>
                Est. 1RM: {displayWeight(e1rmData.e1rm)}{unitLabel}
              </span>
            )}
          </div>
          {/* Progressive overload hint */}
          {lastLog && (
            <p className="text-[10px] text-muted-foreground mb-1" data-testid={`last-log-${exercise.id}`}>
              Last: {displayWeight(lastLog.weight)}{unitLabel} × {lastLog.reps} × {lastLog.sets} @ RPE {lastLog.rpe}
            </p>
          )}
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className={`text-[10px] h-5 ${accentBg} ${accentClass}`}>
              {exercise.muscleGroup}
            </Badge>
            <ExerciseVideoDialog exercise={exercise} />
          </div>
        </div>
        <Button
          variant={showForm ? "secondary" : "outline"}
          size="sm"
          className="shrink-0 h-8 w-8 p-0"
          onClick={() => setShowForm(!showForm)}
          data-testid={`toggle-form-${exercise.id}`}
        >
          <Plus className={`w-4 h-4 transition-transform ${showForm ? "rotate-45" : ""}`} />
        </Button>
      </div>

      {showForm && (
        <LogEntryForm
          exercise={exercise}
          date={date}
          dayType={dayType}
          onSuccess={() => setShowForm(false)}
        />
      )}

      {exerciseLogs.length > 0 && (
        <div className="mt-3 space-y-1.5">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Logged</p>
          {exerciseLogs.map((log) => (
            <div key={log.id} className="bg-muted/50 rounded-md px-2.5 py-1.5" data-testid={`log-entry-${log.id}`}>
              {editingId === log.id ? (
                <EditLogInline log={log} date={date} onDone={() => setEditingId(null)} />
              ) : (
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">
                    {log.sets}×{log.reps} @ {displayWeight(log.weight)}{unitLabel}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">RPE {log.rpe}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-primary"
                      onClick={() => setEditingId(log.id)}
                      data-testid={`edit-log-${log.id}`}
                    >
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteMutation.mutate(log.id)}
                      data-testid={`delete-log-${log.id}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function SessionNotesSection({ date, dayType }: { date: string; dayType: string }) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { toast } = useToast();

  const { data: noteData } = useQuery({
    queryKey: ["/api/notes", date, dayType],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/notes/${date}/${dayType}`);
      return res.json();
    },
  });

  useEffect(() => {
    if (noteData?.notes !== undefined) {
      setNotes(noteData.notes);
    } else {
      setNotes("");
    }
  }, [noteData]);

  const saveMutation = useMutation({
    mutationFn: async (text: string) => {
      await apiRequest("PUT", `/api/notes/${date}/${dayType}`, { notes: text });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes", date, dayType] });
    },
  });

  const handleChange = useCallback((value: string) => {
    setNotes(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      saveMutation.mutate(value);
    }, 1000);
  }, [saveMutation]);

  const handleBlur = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    saveMutation.mutate(notes);
  };

  return (
    <Card className="p-3" data-testid="session-notes">
      <button
        className="flex items-center justify-between w-full text-left"
        onClick={() => setOpen(!open)}
        data-testid="session-notes-toggle"
      >
        <span className="text-xs font-semibold flex items-center gap-1.5">
          <StickyNote className="w-3.5 h-3.5" />
          Session Notes
          {notes && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
        </span>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
      </button>
      {open && (
        <textarea
          value={notes}
          onChange={e => handleChange(e.target.value)}
          onBlur={handleBlur}
          placeholder="How was the session? Any notes..."
          className="mt-2 w-full min-h-[80px] text-xs p-2 rounded-md border border-input bg-background resize-y"
          data-testid="session-notes-input"
        />
      )}
    </Card>
  );
}

function WorkoutTimer({ date, dayType }: { date: string; dayType: string }) {
  const [elapsed, setElapsed] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: session, refetch: refetchSession } = useQuery<{
    id: number;
    startTime: string;
    endTime: string | null;
    durationMinutes: number | null;
  } | null>({
    queryKey: ["/api/sessions", date, dayType],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/sessions/${date}/${dayType}`);
      return res.json();
    },
  });

  // Start timer when session is active (has startTime, no endTime)
  useEffect(() => {
    if (session?.startTime && !session.endTime) {
      const start = new Date(session.startTime).getTime();
      const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
      tick();
      intervalRef.current = setInterval(tick, 1000);
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    } else if (session?.endTime && session.durationMinutes != null) {
      setElapsed(session.durationMinutes * 60);
      if (intervalRef.current) clearInterval(intervalRef.current);
    } else {
      setElapsed(null);
    }
  }, [session]);

  const startSession = async () => {
    await apiRequest("POST", "/api/sessions/start", { date, dayType });
    refetchSession();
  };

  const endSession = async () => {
    await apiRequest("POST", "/api/sessions/end", { date, dayType });
    if (intervalRef.current) clearInterval(intervalRef.current);
    refetchSession();
  };

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const isRunning = session?.startTime && !session.endTime;
  const isEnded = session?.endTime != null;

  return (
    <Card className="p-3" data-testid="workout-timer">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Timer className={`w-4 h-4 ${isRunning ? "text-emerald-500" : "text-muted-foreground"}`} />
          <span className="text-xs font-semibold">Session Timer</span>
          {elapsed != null && (
            <span className={`text-sm font-mono font-bold ${isRunning ? "text-emerald-500" : "text-muted-foreground"}`} data-testid="timer-display">
              {formatTime(elapsed)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {!session?.startTime && (
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={startSession} data-testid="timer-start">
              <Play className="w-3 h-3" /> Start
            </Button>
          )}
          {isRunning && (
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1 text-red-500 hover:text-red-600" onClick={endSession} data-testid="timer-stop">
              End
            </Button>
          )}
          {isEnded && (
            <Badge variant="secondary" className="text-[10px]">Done</Badge>
          )}
        </div>
      </div>
    </Card>
  );
}

function DeloadBanner() {
  const { data: deloadData } = useQuery<{ suggest: boolean; avgRpe?: number; message?: string }>({
    queryKey: ["/api/stats/deload-check"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/stats/deload-check");
      return res.json();
    },
  });

  if (!deloadData?.suggest) return null;

  return (
    <Card className="p-3 border-amber-500/50 bg-amber-500/10" data-testid="deload-banner">
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">Deload Suggested</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{deloadData.message}</p>
        </div>
      </div>
    </Card>
  );
}

export default function WorkoutDay({
  dayType,
  title,
  subtitle,
  exercises,
  accentClass,
  accentBg,
}: WorkoutDayProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const { toast } = useToast();

  const { data: logs = [], isLoading } = useQuery<WorkoutLog[]>({
    queryKey: ["/api/logs/date", dateStr],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/logs/date/${dateStr}`);
      return res.json();
    },
  });

  const dayLogs = logs.filter((l) => l.dayType === dayType);

  // Repeat last session mutation
  const repeatMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("GET", `/api/logs/last-session/${dayType}?excludeDate=${dateStr}`);
      const lastSessionLogs: WorkoutLog[] = await res.json();
      if (!lastSessionLogs.length) throw new Error("No previous session found");

      const created: WorkoutLog[] = [];
      for (const log of lastSessionLogs) {
        const r = await apiRequest("POST", "/api/logs", {
          date: dateStr,
          dayType: log.dayType,
          exerciseId: log.exerciseId,
          exerciseName: log.exerciseName,
          sets: log.sets,
          reps: log.reps,
          weight: log.weight,
          rpe: log.rpe,
        });
        created.push(await r.json());
      }
      return created;
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["/api/logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/logs/date", dateStr] });
      toast({ title: "Repeated", description: `${created.length} exercise(s) copied from last session.` });
    },
    onError: (err: Error) => {
      toast({
        title: "No previous session",
        description: err.message === "No previous session found" ? "Log a workout first!" : "Failed to repeat session.",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-5">
      <div>
        <h2 className={`text-lg font-bold ${accentClass}`}>{title}</h2>
        <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2 h-9 text-sm" data-testid="date-picker-trigger">
              <CalendarIcon className="w-3.5 h-3.5" />
              {format(selectedDate, "EEE, MMM d, yyyy")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(d) => d && setSelectedDate(d)}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        {dayLogs.length > 0 && (
          <Badge variant="secondary" className="text-xs">
            {dayLogs.length} logged
          </Badge>
        )}
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-1.5 text-xs ml-auto"
          onClick={() => repeatMutation.mutate()}
          disabled={repeatMutation.isPending}
          data-testid="repeat-last-session"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${repeatMutation.isPending ? "animate-spin" : ""}`} />
          Repeat Last
        </Button>
      </div>

      {/* Deload Warning */}
      <DeloadBanner />

      {/* Workout Timer */}
      <WorkoutTimer date={dateStr} dayType={dayType} />

      {/* Session Notes */}
      <SessionNotesSection date={dateStr} dayType={dayType} />

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-4 animate-pulse">
              <div className="h-4 w-40 bg-muted rounded" />
              <div className="h-3 w-24 bg-muted rounded mt-2" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {exercises.map((exercise) => (
            <ExerciseCard
              key={exercise.id}
              exercise={exercise}
              date={dateStr}
              dayType={dayType}
              logs={dayLogs}
              accentClass={accentClass}
              accentBg={accentBg}
            />
          ))}
        </div>
      )}
    </div>
  );
}
