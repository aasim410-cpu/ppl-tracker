import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format, parseISO } from "date-fns";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Scale, Trash2, Plus, TrendingDown, TrendingUp } from "lucide-react";
import { useUnit } from "@/lib/unit";
import type { BodyWeight } from "@shared/schema";

export default function BodyWeightPage() {
  const { displayWeight, toKg, unitLabel } = useUnit();
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [weight, setWeight] = useState("");
  const { toast } = useToast();

  const { data: entries = [], isLoading } = useQuery<BodyWeight[]>({
    queryKey: ["/api/bodyweight"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/bodyweight");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/bodyweight", { date, weight: toKg(Number(weight)) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bodyweight"] });
      toast({ title: "Logged", description: `Body weight recorded: ${weight}${unitLabel}` });
      setWeight("");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to log body weight.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/bodyweight/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bodyweight"] });
      toast({ title: "Deleted", description: "Entry removed." });
    },
  });

  // Chart data (sorted ascending for line chart)
  const chartData = [...entries]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(e => ({
      date: format(parseISO(e.date), "MMM d"),
      weight: displayWeight(e.weight),
    }));

  // Stats
  const latest = entries[0] ? displayWeight(entries[0].weight) : undefined;
  const previous = entries[1] ? displayWeight(entries[1].weight) : undefined;
  const diff = latest !== undefined && previous !== undefined ? (latest - previous).toFixed(1) : null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-blue-500 dark:text-blue-400">Body Weight</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Track your weight over time</p>
      </div>

      {/* Log form */}
      <Card className="p-4" data-testid="bodyweight-form">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Label className="text-xs text-muted-foreground mb-1.5 block">Date</Label>
            <Input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="h-9"
              data-testid="bodyweight-date"
            />
          </div>
          <div className="flex-1">
            <Label className="text-xs text-muted-foreground mb-1.5 block">Weight ({unitLabel})</Label>
            <Input
              type="number"
              min={0}
              step={0.1}
              value={weight}
              onChange={e => setWeight(e.target.value)}
              placeholder="e.g. 75.5"
              className="h-9"
              data-testid="bodyweight-weight"
            />
          </div>
          <Button
            className="h-9 gap-1.5"
            onClick={() => createMutation.mutate()}
            disabled={!weight || createMutation.isPending}
            data-testid="bodyweight-submit"
          >
            <Plus className="w-3.5 h-3.5" />
            Log
          </Button>
        </div>
      </Card>

      {/* Current stats */}
      {latest !== undefined && (
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-3">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Latest</p>
            <p className="text-lg font-bold mt-0.5">{latest} {unitLabel}</p>
          </Card>
          <Card className="p-3">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Change</p>
            <div className="flex items-center gap-1 mt-0.5">
              {diff ? (
                <>
                  {Number(diff) < 0 ? <TrendingDown className="w-4 h-4 text-emerald-500" /> : Number(diff) > 0 ? <TrendingUp className="w-4 h-4 text-amber-500" /> : null}
                  <p className="text-lg font-bold">{Number(diff) > 0 ? "+" : ""}{diff} {unitLabel}</p>
                </>
              ) : (
                <p className="text-lg font-bold text-muted-foreground">—</p>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Chart */}
      {chartData.length > 1 && (
        <Card className="p-4">
          <p className="text-xs font-semibold mb-3">Weight Trend</p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis
                  tick={{ fontSize: 10 }}
                  stroke="hsl(var(--muted-foreground))"
                  domain={["dataMin - 1", "dataMax + 1"]}
                />
                <Tooltip
                  formatter={(value: number) => `${value} ${unitLabel}`}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="weight"
                  stroke="hsl(210, 70%, 55%)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Entry list */}
      <Card className="p-4">
        <p className="text-xs font-semibold mb-3">Recent Entries</p>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-8 bg-muted rounded animate-pulse" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No entries yet. Log your first weight above.</p>
        ) : (
          <div className="space-y-1.5">
            {entries.slice(0, 20).map(entry => (
              <div key={entry.id} className="flex items-center justify-between text-xs bg-muted/50 rounded-md px-2.5 py-1.5" data-testid={`bodyweight-entry-${entry.id}`}>
                <span className="text-muted-foreground">{format(parseISO(entry.date), "EEE, MMM d, yyyy")}</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{displayWeight(entry.weight)} {unitLabel}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteMutation.mutate(entry.id)}
                    data-testid={`delete-bodyweight-${entry.id}`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
