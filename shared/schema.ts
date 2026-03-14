import { pgTable, text, varchar, integer, real, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

// Workout log entries
export const workoutLogs = pgTable("workout_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  date: text("date").notNull(), // YYYY-MM-DD
  dayType: text("day_type").notNull(), // 'push' | 'pull' | 'legs'
  exerciseId: text("exercise_id").notNull(),
  exerciseName: text("exercise_name").notNull(),
  sets: integer("sets").notNull(),
  reps: integer("reps").notNull(),
  weight: real("weight").notNull(),
  rpe: integer("rpe").notNull(), // 1-10
});

export const insertWorkoutLogSchema = createInsertSchema(workoutLogs).omit({ id: true });
export type InsertWorkoutLog = z.infer<typeof insertWorkoutLogSchema>;
export type WorkoutLog = typeof workoutLogs.$inferSelect;

// Exercise definitions (static data)
export interface Exercise {
  id: string;
  name: string;
  dayType: 'push' | 'pull' | 'legs';
  muscleGroup: string;
  videoUrl: string;
  videoId: string;
}

// Session notes
export interface SessionNote {
  id: number;
  userId: number;
  date: string;
  dayType: string;
  notes: string;
}

// Body weight tracking
export interface BodyWeight {
  id: number;
  userId: number;
  date: string;
  weight: number;
}

export const exercises: Exercise[] = [
  // PUSH DAY
  {
    id: "db-flat-press",
    name: "Dumbbell Flat Bench Press",
    dayType: "push",
    muscleGroup: "Chest",
    videoUrl: "https://www.youtube.com/watch?v=VmB1G1K7v94",
    videoId: "VmB1G1K7v94",
  },
  {
    id: "db-incline-press",
    name: "Dumbbell Incline Press",
    dayType: "push",
    muscleGroup: "Upper Chest",
    videoUrl: "https://www.youtube.com/watch?v=XgwXopZadqs",
    videoId: "XgwXopZadqs",
  },
  {
    id: "db-shoulder-press",
    name: "Dumbbell Shoulder Press",
    dayType: "push",
    muscleGroup: "Shoulders",
    videoUrl: "https://www.youtube.com/watch?v=qEwKCR5JCog",
    videoId: "qEwKCR5JCog",
  },
  {
    id: "db-lateral-raise",
    name: "Dumbbell Lateral Raise",
    dayType: "push",
    muscleGroup: "Side Delts",
    videoUrl: "https://www.youtube.com/watch?v=3VcKaXpzqRo",
    videoId: "3VcKaXpzqRo",
  },
  {
    id: "db-overhead-tricep",
    name: "Dumbbell Overhead Tricep Extension",
    dayType: "push",
    muscleGroup: "Triceps",
    videoUrl: "https://www.youtube.com/watch?v=-Vyt2QdsR7E",
    videoId: "-Vyt2QdsR7E",
  },
  {
    id: "db-fly",
    name: "Dumbbell Chest Fly",
    dayType: "push",
    muscleGroup: "Chest",
    videoUrl: "https://www.youtube.com/watch?v=eozdVDA78K0",
    videoId: "eozdVDA78K0",
  },

  // PULL DAY
  {
    id: "db-bent-row",
    name: "Dumbbell Bent-Over Row",
    dayType: "pull",
    muscleGroup: "Back",
    videoUrl: "https://www.youtube.com/watch?v=6TSP1TRMUzs",
    videoId: "6TSP1TRMUzs",
  },
  {
    id: "db-single-row",
    name: "Dumbbell Single-Arm Row",
    dayType: "pull",
    muscleGroup: "Lats",
    videoUrl: "https://www.youtube.com/watch?v=yJ8NTl5RaTk",
    videoId: "yJ8NTl5RaTk",
  },
  {
    id: "db-bicep-curl",
    name: "Dumbbell Bicep Curl",
    dayType: "pull",
    muscleGroup: "Biceps",
    videoUrl: "https://www.youtube.com/watch?v=ykJmrZ5v0Oo",
    videoId: "ykJmrZ5v0Oo",
  },
  {
    id: "db-hammer-curl",
    name: "Dumbbell Hammer Curl",
    dayType: "pull",
    muscleGroup: "Biceps / Forearms",
    videoUrl: "https://www.youtube.com/watch?v=XE_pHwbst04",
    videoId: "XE_pHwbst04",
  },
  {
    id: "db-shrug",
    name: "Dumbbell Shrugs",
    dayType: "pull",
    muscleGroup: "Traps",
    videoUrl: "https://www.youtube.com/watch?v=cJRVVxmytaM",
    videoId: "cJRVVxmytaM",
  },
  {
    id: "db-reverse-fly",
    name: "Dumbbell Reverse Fly",
    dayType: "pull",
    muscleGroup: "Rear Delts",
    videoUrl: "https://www.youtube.com/watch?v=ttvfGg9d76c",
    videoId: "ttvfGg9d76c",
  },

  // LEG DAY
  {
    id: "db-squat",
    name: "Dumbbell Squat",
    dayType: "legs",
    muscleGroup: "Quads / Glutes",
    videoUrl: "https://www.youtube.com/watch?v=v_c67Omje48",
    videoId: "v_c67Omje48",
  },
  {
    id: "db-rdl",
    name: "Dumbbell Romanian Deadlift",
    dayType: "legs",
    muscleGroup: "Hamstrings / Glutes",
    videoUrl: "https://www.youtube.com/watch?v=hQgFixeXdZo",
    videoId: "hQgFixeXdZo",
  },
  {
    id: "db-lunge",
    name: "Dumbbell Lunges",
    dayType: "legs",
    muscleGroup: "Quads / Glutes",
    videoUrl: "https://www.youtube.com/watch?v=D7KaRcUTQeE",
    videoId: "D7KaRcUTQeE",
  },
  {
    id: "db-goblet-squat",
    name: "Dumbbell Goblet Squat",
    dayType: "legs",
    muscleGroup: "Quads",
    videoUrl: "https://www.youtube.com/watch?v=MeIiIdhvXT4",
    videoId: "MeIiIdhvXT4",
  },
  {
    id: "db-step-up",
    name: "Dumbbell Step-Up",
    dayType: "legs",
    muscleGroup: "Quads / Glutes",
    videoUrl: "https://www.youtube.com/watch?v=dQqApCGd5Ss",
    videoId: "dQqApCGd5Ss",
  },
  {
    id: "db-calf-raise",
    name: "Dumbbell Calf Raise",
    dayType: "legs",
    muscleGroup: "Calves",
    videoUrl: "https://www.youtube.com/watch?v=wxwY7GXxk4E",
    videoId: "wxwY7GXxk4E",
  },
];
