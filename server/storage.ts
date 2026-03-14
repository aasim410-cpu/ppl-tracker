import Database from "better-sqlite3";
import path from "path";
import { WorkoutLog, InsertWorkoutLog } from "@shared/schema";

export interface IStorage {
  getWorkoutLogs(): Promise<WorkoutLog[]>;
  getWorkoutLogsByDate(date: string): Promise<WorkoutLog[]>;
  getWorkoutLogsByDateRange(startDate: string, endDate: string): Promise<WorkoutLog[]>;
  createWorkoutLog(log: InsertWorkoutLog): Promise<WorkoutLog>;
  deleteWorkoutLog(id: string): Promise<void>;
}

export class SqliteStorage implements IStorage {
  private db: Database.Database;

  constructor() {
    const dbPath = path.join(process.cwd(), "ppl-tracker.db");
    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
    this.init();
  }

  private init() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS workout_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        day_type TEXT NOT NULL,
        exercise_id TEXT NOT NULL,
        exercise_name TEXT NOT NULL,
        sets INTEGER NOT NULL,
        reps INTEGER NOT NULL,
        weight REAL NOT NULL,
        rpe INTEGER NOT NULL
      )
    `);
  }

  async getWorkoutLogs(): Promise<WorkoutLog[]> {
    const rows = this.db.prepare(
      "SELECT id, date, day_type as dayType, exercise_id as exerciseId, exercise_name as exerciseName, sets, reps, weight, rpe FROM workout_logs ORDER BY date DESC"
    ).all() as WorkoutLog[];
    return rows.map(r => ({ ...r, id: String(r.id) }));
  }

  async getWorkoutLogsByDate(date: string): Promise<WorkoutLog[]> {
    const rows = this.db.prepare(
      "SELECT id, date, day_type as dayType, exercise_id as exerciseId, exercise_name as exerciseName, sets, reps, weight, rpe FROM workout_logs WHERE date = ? ORDER BY id"
    ).all(date) as WorkoutLog[];
    return rows.map(r => ({ ...r, id: String(r.id) }));
  }

  async getWorkoutLogsByDateRange(startDate: string, endDate: string): Promise<WorkoutLog[]> {
    const rows = this.db.prepare(
      "SELECT id, date, day_type as dayType, exercise_id as exerciseId, exercise_name as exerciseName, sets, reps, weight, rpe FROM workout_logs WHERE date >= ? AND date <= ? ORDER BY date ASC"
    ).all(startDate, endDate) as WorkoutLog[];
    return rows.map(r => ({ ...r, id: String(r.id) }));
  }

  async createWorkoutLog(log: InsertWorkoutLog): Promise<WorkoutLog> {
    const stmt = this.db.prepare(
      "INSERT INTO workout_logs (date, day_type, exercise_id, exercise_name, sets, reps, weight, rpe) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    );
    const result = stmt.run(log.date, log.dayType, log.exerciseId, log.exerciseName, log.sets, log.reps, log.weight, log.rpe);
    return {
      id: String(result.lastInsertRowid),
      ...log,
    };
  }

  async deleteWorkoutLog(id: string): Promise<void> {
    this.db.prepare("DELETE FROM workout_logs WHERE id = ?").run(id);
  }
}

export const storage = new SqliteStorage();
