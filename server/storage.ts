import Database from "better-sqlite3";
import path from "path";
import { WorkoutLog, InsertWorkoutLog } from "@shared/schema";

export interface User {
  id: number;
  username: string;
  passwordHash: string;
}

export interface IStorage {
  // Users
  createUser(username: string, passwordHash: string): User;
  getUserByUsername(username: string): User | undefined;
  getUserById(id: number): User | undefined;

  // Workout logs (scoped to userId)
  getWorkoutLogs(userId: number): Promise<WorkoutLog[]>;
  getWorkoutLogsByDate(userId: number, date: string): Promise<WorkoutLog[]>;
  getWorkoutLogsByDateRange(userId: number, startDate: string, endDate: string): Promise<WorkoutLog[]>;
  createWorkoutLog(userId: number, log: InsertWorkoutLog): Promise<WorkoutLog>;
  deleteWorkoutLog(userId: number, id: string): Promise<void>;
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
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL
      )
    `);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS workout_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        day_type TEXT NOT NULL,
        exercise_id TEXT NOT NULL,
        exercise_name TEXT NOT NULL,
        sets INTEGER NOT NULL,
        reps INTEGER NOT NULL,
        weight REAL NOT NULL,
        rpe INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);
    // Add user_id column if migrating from old schema
    try {
      this.db.exec("ALTER TABLE workout_logs ADD COLUMN user_id INTEGER NOT NULL DEFAULT 0");
    } catch {
      // Column already exists
    }
  }

  createUser(username: string, passwordHash: string): User {
    const stmt = this.db.prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)");
    const result = stmt.run(username, passwordHash);
    return { id: Number(result.lastInsertRowid), username, passwordHash };
  }

  getUserByUsername(username: string): User | undefined {
    const row = this.db.prepare("SELECT id, username, password_hash as passwordHash FROM users WHERE username = ?").get(username) as User | undefined;
    return row;
  }

  getUserById(id: number): User | undefined {
    const row = this.db.prepare("SELECT id, username, password_hash as passwordHash FROM users WHERE id = ?").get(id) as User | undefined;
    return row;
  }

  async getWorkoutLogs(userId: number): Promise<WorkoutLog[]> {
    const rows = this.db.prepare(
      "SELECT id, date, day_type as dayType, exercise_id as exerciseId, exercise_name as exerciseName, sets, reps, weight, rpe FROM workout_logs WHERE user_id = ? ORDER BY date DESC"
    ).all(userId) as WorkoutLog[];
    return rows.map(r => ({ ...r, id: String(r.id) }));
  }

  async getWorkoutLogsByDate(userId: number, date: string): Promise<WorkoutLog[]> {
    const rows = this.db.prepare(
      "SELECT id, date, day_type as dayType, exercise_id as exerciseId, exercise_name as exerciseName, sets, reps, weight, rpe FROM workout_logs WHERE user_id = ? AND date = ? ORDER BY id"
    ).all(userId, date) as WorkoutLog[];
    return rows.map(r => ({ ...r, id: String(r.id) }));
  }

  async getWorkoutLogsByDateRange(userId: number, startDate: string, endDate: string): Promise<WorkoutLog[]> {
    const rows = this.db.prepare(
      "SELECT id, date, day_type as dayType, exercise_id as exerciseId, exercise_name as exerciseName, sets, reps, weight, rpe FROM workout_logs WHERE user_id = ? AND date >= ? AND date <= ? ORDER BY date ASC"
    ).all(userId, startDate, endDate) as WorkoutLog[];
    return rows.map(r => ({ ...r, id: String(r.id) }));
  }

  async createWorkoutLog(userId: number, log: InsertWorkoutLog): Promise<WorkoutLog> {
    const stmt = this.db.prepare(
      "INSERT INTO workout_logs (user_id, date, day_type, exercise_id, exercise_name, sets, reps, weight, rpe) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );
    const result = stmt.run(userId, log.date, log.dayType, log.exerciseId, log.exerciseName, log.sets, log.reps, log.weight, log.rpe);
    return {
      id: String(result.lastInsertRowid),
      ...log,
    };
  }

  async deleteWorkoutLog(userId: number, id: string): Promise<void> {
    this.db.prepare("DELETE FROM workout_logs WHERE id = ? AND user_id = ?").run(id, userId);
  }
}

export const storage = new SqliteStorage();
