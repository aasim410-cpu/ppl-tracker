import WorkoutDay from "@/components/workout-day";
import { exercises } from "@shared/schema";

const legsExercises = exercises.filter((e) => e.dayType === "legs");

export default function LegsDay() {
  return (
    <WorkoutDay
      dayType="legs"
      title="Leg Day"
      subtitle="Quads, Hamstrings, Glutes, Calves"
      exercises={legsExercises}
      accentClass="text-pink-500 dark:text-pink-400"
      accentBg="bg-pink-500/10"
    />
  );
}
