import Database from "better-sqlite3";
import path from "path";
import { WorkoutLog, InsertWorkoutLog, SessionNote, BodyWeight } from "@shared/schema";

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
  updateWorkoutLog(userId: number, id: string, data: { sets?: number; reps?: number; weight?: number; rpe?: number }): Promise<WorkoutLog | null>;

  // Progressive overload / PR
  getLastLog(userId: number, exerciseId: string, excludeDate?: string): Promise<WorkoutLog | null>;
  getPR(userId: number, exerciseId: string): Promise<number | null>;
  getLastSession(userId: number, dayType: string, excludeDate?: string): Promise<WorkoutLog[]>;

  // Session notes
  getSessionNote(userId: number, date: string, dayType: string): Promise<SessionNote | null>;
  upsertSessionNote(userId: number, date: string, dayType: string, notes: string): Promise<SessionNote>;

  // Body weight
  getBodyWeights(userId: number): Promise<BodyWeight[]>;
  createBodyWeight(userId: number, date: string, weight: number): Promise<BodyWeight>;
  deleteBodyWeight(userId: number, id: number): Promise<void>;
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

    // Session notes table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS session_notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        day_type TEXT NOT NULL,
        notes TEXT NOT NULL DEFAULT '',
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE(user_id, date, day_type)
      )
    `);

    // Body weight table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS body_weight (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        weight REAL NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);
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

  async updateWorkoutLog(userId: number, id: string, data: { sets?: number; reps?: number; weight?: number; rpe?: number }): Promise<WorkoutLog | null> {
    const fields: string[] = [];
    const values: any[] = [];
    if (data.sets !== undefined) { fields.push("sets = ?"); values.push(data.sets); }
    if (data.reps !== undefined) { fields.push("reps = ?"); values.push(data.reps); }
    if (data.weight !== undefined) { fields.push("weight = ?"); values.push(data.weight); }
    if (data.rpe !== undefined) { fields.push("rpe = ?"); values.push(data.rpe); }
    if (fields.length === 0) return null;

    values.push(id, userId);
    this.db.prepare(`UPDATE workout_logs SET ${fields.join(", ")} WHERE id = ? AND user_id = ?`).run(...values);

    const row = this.db.prepare(
      "SELECT id, date, day_type as dayType, exercise_id as exerciseId, exercise_name as exerciseName, sets, reps, weight, rpe FROM workout_logs WHERE id = ? AND user_id = ?"
    ).get(id, userId) as WorkoutLog | undefined;
    if (!row) return null;
    return { ...row, id: String(row.id) };
  }

  async getLastLog(userId: number, exerciseId: string, excludeDate?: string): Promise<WorkoutLog | null> {
    let query = "SELECT id, date, day_type as dayType, exercise_id as exerciseId, exercise_name as exerciseName, sets, reps, weight, rpe FROM workout_logs WHERE user_id = ? AND exercise_id = ?";
    const params: any[] = [userId, exerciseId];
    if (excludeDate) {
      query += " AND date != ?";
      params.push(excludeDate);
    }
    query += " ORDER BY date DESC, id DESC LIMIT 1";
    const row = this.db.prepare(query).get(...params) as WorkoutLog | undefined;
    if (!row) return null;
    return { ...row, id: String(row.id) };
  }

  async getPR(userId: number, exerciseId: string): Promise<number | null> {
    const row = this.db.prepare(
      "SELECT MAX(weight) as maxWeight FROM workout_logs WHERE user_id = ? AND exercise_id = ?"
    ).get(userId, exerciseId) as { maxWeight: number | null } | undefined;
    return row?.maxWeight ?? null;
  }

  async getLastSession(userId: number, dayType: string, excludeDate?: string): Promise<WorkoutLog[]> {
    // Find the most recent date for this dayType (excluding excludeDate)
    let dateQuery = "SELECT DISTINCT date FROM workout_logs WHERE user_id = ? AND day_type = ?";
    const dateParams: any[] = [userId, dayType];
    if (excludeDate) {
      dateQuery += " AND date != ?";
      dateParams.push(excludeDate);
    }
    dateQuery += " ORDER BY date DESC LIMIT 1";
    const dateRow = this.db.prepare(dateQuery).get(...dateParams) as { date: string } | undefined;
    if (!dateRow) return [];

    const rows = this.db.prepare(
      "SELECT id, date, day_type as dayType, exercise_id as exerciseId, exercise_name as exerciseName, sets, reps, weight, rpe FROM workout_logs WHERE user_id = ? AND day_type = ? AND date = ? ORDER BY id"
    ).all(userId, dayType, dateRow.date) as WorkoutLog[];
    return rows.map(r => ({ ...r, id: String(r.id) }));
  }

  // Session notes
  async getSessionNote(userId: number, date: string, dayType: string): Promise<SessionNote | null> {
    const row = this.db.prepare(
      "SELECT id, user_id as userId, date, day_type as dayType, notes FROM session_notes WHERE user_id = ? AND date = ? AND day_type = ?"
    ).get(userId, date, dayType) as SessionNote | undefined;
    return row ?? null;
  }

  async upsertSessionNote(userId: number, date: string, dayType: string, notes: string): Promise<SessionNote> {
    this.db.prepare(
      "INSERT INTO session_notes (user_id, date, day_type, notes) VALUES (?, ?, ?, ?) ON CONFLICT(user_id, date, day_type) DO UPDATE SET notes = excluded.notes"
    ).run(userId, date, dayType, notes);
    const row = this.db.prepare(
      "SELECT id, user_id as userId, date, day_type as dayType, notes FROM session_notes WHERE user_id = ? AND date = ? AND day_type = ?"
    ).get(userId, date, dayType) as SessionNote;
    return row;
  }

  // Body weight
  async getBodyWeights(userId: number): Promise<BodyWeight[]> {
    const rows = this.db.prepare(
      "SELECT id, user_id as userId, date, weight FROM body_weight WHERE user_id = ? ORDER BY date DESC"
    ).all(userId) as BodyWeight[];
    return rows;
  }

  async createBodyWeight(userId: number, date: string, weight: number): Promise<BodyWeight> {
    const result = this.db.prepare(
      "INSERT INTO body_weight (user_id, date, weight) VALUES (?, ?, ?)"
    ).run(userId, date, weight);
    return { id: Number(result.lastInsertRowid), userId, date, weight };
  }

  async deleteBodyWeight(userId: number, id: number): Promise<void> {
    this.db.prepare("DELETE FROM body_weight WHERE id = ? AND user_id = ?").run(id, userId);
  }
}

export const storage = new SqliteStorage();
