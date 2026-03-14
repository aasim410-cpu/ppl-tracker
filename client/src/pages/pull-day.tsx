import WorkoutDay from "@/components/workout-day";
import { exercises } from "@shared/schema";

const pullExercises = exercises.filter((e) => e.dayType === "pull");

export default function PullDay() {
  return (
    <WorkoutDay
      dayType="pull"
      title="Pull Day"
      subtitle="Back, Biceps, Rear Delts"
      exercises={pullExercises}
      accentClass="text-emerald-500 dark:text-emerald-400"
      accentBg="bg-emerald-500/10"
    />
  );
}
