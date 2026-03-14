import WorkoutDay from "@/components/workout-day";
import { exercises } from "@shared/schema";

const pushExercises = exercises.filter((e) => e.dayType === "push");

export default function PushDay() {
  return (
    <WorkoutDay
      dayType="push"
      title="Push Day"
      subtitle="Chest, Shoulders, Triceps"
      exercises={pushExercises}
      accentClass="text-violet-500 dark:text-violet-400"
      accentBg="bg-violet-500/10"
    />
  );
}
