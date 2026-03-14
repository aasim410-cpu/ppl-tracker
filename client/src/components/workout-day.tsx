import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format, startOfMonth, endOfMonth } from "date-fns";
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
import { CalendarIcon, Play, Plus, Trash2, Weight, Repeat, Layers, Gauge } from "lucide-react";
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
  const [sets, setSets] = useState(3);
  const [reps, setReps] = useState(10);
  const [weight, setWeight] = useState(20);
  const [rpe, setRpe] = useState(7);
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logs", {
        date,
        dayType,
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        sets,
        reps,
        weight,
        rpe,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/logs/date", date] });
      toast({ title: "Logged", description: `${exercise.name} recorded.` });
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
            <Weight className="w-3 h-3" /> Weight
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
  const exerciseLogs = logs.filter((l) => l.exerciseId === exercise.id);
  const { toast } = useToast();

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
          </div>
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
            <div key={log.id} className="flex items-center justify-between text-xs bg-muted/50 rounded-md px-2.5 py-1.5" data-testid={`log-entry-${log.id}`}>
              <span className="font-medium">
                {log.sets}×{log.reps} @ {log.weight}kg
              </span>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">RPE {log.rpe}</span>
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
          ))}
        </div>
      )}
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

  const { data: logs = [], isLoading } = useQuery<WorkoutLog[]>({
    queryKey: ["/api/logs/date", dateStr],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/logs/date/${dateStr}`);
      return res.json();
    },
  });

  const dayLogs = logs.filter((l) => l.dayType === dayType);

  return (
    <div className="space-y-5">
      <div>
        <h2 className={`text-lg font-bold ${accentClass}`}>{title}</h2>
        <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
      </div>

      <div className="flex items-center gap-2">
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
      </div>

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
