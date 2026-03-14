import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO } from "date-fns";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import { Dumbbell, TrendingUp, CalendarDays, Flame, ArrowUp, ArrowDown, Footprints } from "lucide-react";
import type { WorkoutLog } from "@shared/schema";

type TimeRange = "7d" | "30d" | "all";

export default function Aggregate() {
  const [range, setRange] = useState<TimeRange>("30d");
  const [calMonth, setCalMonth] = useState<Date>(new Date());

  const startDate = range === "7d"
    ? format(subDays(new Date(), 7), "yyyy-MM-dd")
    : range === "30d"
    ? format(subDays(new Date(), 30), "yyyy-MM-dd")
    : "2000-01-01";
  const endDate = format(new Date(), "yyyy-MM-dd");

  const { data: logs = [], isLoading } = useQuery<WorkoutLog[]>({
    queryKey: ["/api/logs/range", startDate, endDate],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/logs/range?start=${startDate}&end=${endDate}`);
      return res.json();
    },
  });

  // Calendar month logs for heatmap
  const calStart = format(startOfMonth(calMonth), "yyyy-MM-dd");
  const calEnd = format(endOfMonth(calMonth), "yyyy-MM-dd");
  const { data: calLogs = [] } = useQuery<WorkoutLog[]>({
    queryKey: ["/api/logs/range", calStart, calEnd],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/logs/range?start=${calStart}&end=${calEnd}`);
      return res.json();
    },
  });

  const stats = useMemo(() => {
    if (!logs.length) return null;

    const totalSets = logs.reduce((s, l) => s + l.sets, 0);
    const totalReps = logs.reduce((s, l) => s + l.reps * l.sets, 0);
    const totalVolume = logs.reduce((s, l) => s + l.weight * l.reps * l.sets, 0);
    const avgRpe = logs.reduce((s, l) => s + l.rpe, 0) / logs.length;
    const uniqueDays = new Set(logs.map((l) => l.date)).size;

    const pushLogs = logs.filter((l) => l.dayType === "push");
    const pullLogs = logs.filter((l) => l.dayType === "pull");
    const legsLogs = logs.filter((l) => l.dayType === "legs");

    // Volume by day type
    const volumeByType = [
      { name: "Push", value: pushLogs.reduce((s, l) => s + l.weight * l.reps * l.sets, 0), color: "hsl(250, 70%, 62%)" },
      { name: "Pull", value: pullLogs.reduce((s, l) => s + l.weight * l.reps * l.sets, 0), color: "hsl(170, 50%, 52%)" },
      { name: "Legs", value: legsLogs.reduce((s, l) => s + l.weight * l.reps * l.sets, 0), color: "hsl(340, 55%, 60%)" },
    ];

    // Volume over time (group by date)
    const dateMap = new Map<string, { push: number; pull: number; legs: number }>();
    logs.forEach((l) => {
      const existing = dateMap.get(l.date) || { push: 0, pull: 0, legs: 0 };
      existing[l.dayType as keyof typeof existing] += l.weight * l.reps * l.sets;
      dateMap.set(l.date, existing);
    });
    const volumeOverTime = Array.from(dateMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({
        date: format(parseISO(date), "MMM d"),
        Push: Math.round(v.push),
        Pull: Math.round(v.pull),
        Legs: Math.round(v.legs),
      }));

    // Top exercises by total volume
    const exerciseMap = new Map<string, { name: string; volume: number; dayType: string }>();
    logs.forEach((l) => {
      const existing = exerciseMap.get(l.exerciseId) || { name: l.exerciseName, volume: 0, dayType: l.dayType };
      existing.volume += l.weight * l.reps * l.sets;
      exerciseMap.set(l.exerciseId, existing);
    });
    const topExercises = Array.from(exerciseMap.values())
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 5);

    return {
      totalSets,
      totalReps,
      totalVolume: Math.round(totalVolume),
      avgRpe: avgRpe.toFixed(1),
      uniqueDays,
      volumeByType,
      volumeOverTime,
      topExercises,
      pushCount: new Set(pushLogs.map(l => l.date)).size,
      pullCount: new Set(pullLogs.map(l => l.date)).size,
      legsCount: new Set(legsLogs.map(l => l.date)).size,
    };
  }, [logs]);

  // Calendar workout days
  const workoutDays = useMemo(() => {
    const dayMap = new Map<string, string>();
    calLogs.forEach((l) => {
      if (!dayMap.has(l.date)) {
        dayMap.set(l.date, l.dayType);
      }
    });
    return dayMap;
  }, [calLogs]);

  const dayTypeIcon = (type: string) => {
    switch (type) {
      case "push": return <ArrowUp className="w-3 h-3 text-violet-500" />;
      case "pull": return <ArrowDown className="w-3 h-3 text-emerald-500" />;
      case "legs": return <Footprints className="w-3 h-3 text-pink-500" />;
      default: return null;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-32 bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-4 animate-pulse">
              <div className="h-4 w-16 bg-muted rounded" />
              <div className="h-6 w-20 bg-muted rounded mt-2" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-amber-500 dark:text-amber-400">Stats</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Aggregate workout data</p>
      </div>

      <div className="flex gap-1.5">
        {(["7d", "30d", "all"] as TimeRange[]).map((r) => (
          <Button
            key={r}
            variant={range === r ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs px-3"
            onClick={() => setRange(r)}
            data-testid={`range-${r}`}
          >
            {r === "7d" ? "7 Days" : r === "30d" ? "30 Days" : "All Time"}
          </Button>
        ))}
      </div>

      {!stats ? (
        <Card className="p-8 text-center">
          <Dumbbell className="w-8 h-8 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">No workouts logged yet. Start logging on Push, Pull, or Legs pages.</p>
        </Card>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-3">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Total Volume</p>
              <p className="text-lg font-bold mt-0.5">{stats.totalVolume.toLocaleString()} kg</p>
            </Card>
            <Card className="p-3">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Workout Days</p>
              <p className="text-lg font-bold mt-0.5">{stats.uniqueDays}</p>
            </Card>
            <Card className="p-3">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Total Sets</p>
              <p className="text-lg font-bold mt-0.5">{stats.totalSets}</p>
            </Card>
            <Card className="p-3">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Avg RPE</p>
              <p className="text-lg font-bold mt-0.5">{stats.avgRpe}</p>
            </Card>
          </div>

          {/* Day distribution */}
          <Card className="p-4">
            <p className="text-xs font-semibold mb-3">Sessions by Type</p>
            <div className="flex gap-3">
              <div className="flex-1 text-center">
                <div className="w-10 h-10 rounded-full bg-violet-500/10 flex items-center justify-center mx-auto mb-1">
                  <ArrowUp className="w-4 h-4 text-violet-500" />
                </div>
                <p className="text-sm font-bold">{stats.pushCount}</p>
                <p className="text-[10px] text-muted-foreground">Push</p>
              </div>
              <div className="flex-1 text-center">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-1">
                  <ArrowDown className="w-4 h-4 text-emerald-500" />
                </div>
                <p className="text-sm font-bold">{stats.pullCount}</p>
                <p className="text-[10px] text-muted-foreground">Pull</p>
              </div>
              <div className="flex-1 text-center">
                <div className="w-10 h-10 rounded-full bg-pink-500/10 flex items-center justify-center mx-auto mb-1">
                  <Footprints className="w-4 h-4 text-pink-500" />
                </div>
                <p className="text-sm font-bold">{stats.legsCount}</p>
                <p className="text-[10px] text-muted-foreground">Legs</p>
              </div>
            </div>
          </Card>

          {/* Volume over time chart */}
          {stats.volumeOverTime.length > 1 && (
            <Card className="p-4">
              <p className="text-xs font-semibold mb-3">Volume Over Time (kg)</p>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.volumeOverTime} barGap={0}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="Push" fill="hsl(250, 70%, 62%)" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="Pull" fill="hsl(170, 50%, 52%)" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="Legs" fill="hsl(340, 55%, 60%)" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          {/* Volume by type pie */}
          <Card className="p-4">
            <p className="text-xs font-semibold mb-3">Volume Split</p>
            <div className="h-48 flex items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.volumeByType.filter(v => v.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {stats.volumeByType.filter(v => v.value > 0).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => `${value.toLocaleString()} kg`}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-2">
              {stats.volumeByType.filter(v => v.value > 0).map((t) => (
                <div key={t.name} className="flex items-center gap-1.5 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                  {t.name}
                </div>
              ))}
            </div>
          </Card>

          {/* Top exercises */}
          <Card className="p-4">
            <p className="text-xs font-semibold mb-3">Top Exercises by Volume</p>
            <div className="space-y-2">
              {stats.topExercises.map((ex, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    {dayTypeIcon(ex.dayType)}
                    <span className="font-medium">{ex.name}</span>
                  </div>
                  <span className="text-muted-foreground">{ex.volume.toLocaleString()} kg</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Calendar heatmap */}
          <Card className="p-4">
            <p className="text-xs font-semibold mb-3">Workout Calendar</p>
            <Calendar
              mode="single"
              month={calMonth}
              onMonthChange={setCalMonth}
              modifiers={{
                push: Array.from(workoutDays.entries()).filter(([, t]) => t === "push").map(([d]) => parseISO(d)),
                pull: Array.from(workoutDays.entries()).filter(([, t]) => t === "pull").map(([d]) => parseISO(d)),
                legs: Array.from(workoutDays.entries()).filter(([, t]) => t === "legs").map(([d]) => parseISO(d)),
              }}
              modifiersClassNames={{
                push: "bg-violet-500/20 text-violet-700 dark:text-violet-300 font-bold",
                pull: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold",
                legs: "bg-pink-500/20 text-pink-700 dark:text-pink-300 font-bold",
              }}
              className="rounded-md"
            />
            <div className="flex justify-center gap-4 mt-3 text-[10px] text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-violet-500/20" /> Push
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-emerald-500/20" /> Pull
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-pink-500/20" /> Legs
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
