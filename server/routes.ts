import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { insertWorkoutLogSchema } from "@shared/schema";
import bcrypt from "bcryptjs";

// Simple token-based auth using in-memory session map
// (Works in sandboxed iframes where cookies are blocked)
const sessions = new Map<string, number>(); // token -> userId

function generateToken(): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let token = "";
  for (let i = 0; i < 64; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token || !sessions.has(token)) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  (req as any).userId = sessions.get(token)!;
  next();
}

export async function registerRoutes(server: Server, app: Express) {
  // Signup
  app.post("/api/auth/signup", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }
    if (username.length < 3) {
      return res.status(400).json({ error: "Username must be at least 3 characters" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const existing = storage.getUserByUsername(username);
    if (existing) {
      return res.status(409).json({ error: "Username already taken" });
    }

    const hash = await bcrypt.hash(password, 10);
    const user = storage.createUser(username, hash);
    const token = generateToken();
    sessions.set(token, user.id);

    res.status(201).json({ token, user: { id: user.id, username: user.username } });
  });

  // Login
  app.post("/api/auth/login", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }

    const user = storage.getUserByUsername(username);
    if (!user) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const token = generateToken();
    sessions.set(token, user.id);

    res.json({ token, user: { id: user.id, username: user.username } });
  });

  // Get current user
  app.get("/api/auth/me", requireAuth, (req, res) => {
    const user = storage.getUserById((req as any).userId);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }
    res.json({ id: user.id, username: user.username });
  });

  // Logout
  app.post("/api/auth/logout", (req, res) => {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (token) sessions.delete(token);
    res.json({ ok: true });
  });

  // Get all workout logs
  app.get("/api/logs", requireAuth, async (req, res) => {
    const logs = await storage.getWorkoutLogs((req as any).userId);
    res.json(logs);
  });

  // Get logs by date
  app.get("/api/logs/date/:date", requireAuth, async (req, res) => {
    const logs = await storage.getWorkoutLogsByDate((req as any).userId, req.params.date);
    res.json(logs);
  });

  // Get logs by date range
  app.get("/api/logs/range", requireAuth, async (req, res) => {
    const { start, end } = req.query;
    if (!start || !end) {
      return res.status(400).json({ error: "start and end query params required" });
    }
    const logs = await storage.getWorkoutLogsByDateRange(
      (req as any).userId,
      start as string,
      end as string
    );
    res.json(logs);
  });

  // Get last log for an exercise (progressive overload)
  app.get("/api/logs/last/:exerciseId", requireAuth, async (req, res) => {
    const excludeDate = req.query.excludeDate as string | undefined;
    const log = await storage.getLastLog((req as any).userId, req.params.exerciseId, excludeDate);
    res.json(log);
  });

  // Get PR (max weight) for an exercise
  app.get("/api/logs/pr/:exerciseId", requireAuth, async (req, res) => {
    const maxWeight = await storage.getPR((req as any).userId, req.params.exerciseId);
    res.json({ maxWeight });
  });

  // Get last session logs for a day type (repeat last session)
  app.get("/api/logs/last-session/:dayType", requireAuth, async (req, res) => {
    const excludeDate = req.query.excludeDate as string | undefined;
    const logs = await storage.getLastSession((req as any).userId, req.params.dayType, excludeDate);
    res.json(logs);
  });

  // Create a workout log
  app.post("/api/logs", requireAuth, async (req, res) => {
    const parsed = insertWorkoutLogSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const log = await storage.createWorkoutLog((req as any).userId, parsed.data);
    res.status(201).json(log);
  });

  // Update a workout log
  app.put("/api/logs/:id", requireAuth, async (req, res) => {
    const { sets, reps, weight, rpe } = req.body;
    const updated = await storage.updateWorkoutLog((req as any).userId, req.params.id, { sets, reps, weight, rpe });
    if (!updated) {
      return res.status(404).json({ error: "Log not found" });
    }
    res.json(updated);
  });

  // Delete a workout log
  app.delete("/api/logs/:id", requireAuth, async (req, res) => {
    await storage.deleteWorkoutLog((req as any).userId, req.params.id);
    res.status(204).send();
  });

  // Session notes
  app.get("/api/notes/:date/:dayType", requireAuth, async (req, res) => {
    const note = await storage.getSessionNote((req as any).userId, req.params.date, req.params.dayType);
    res.json(note);
  });

  app.put("/api/notes/:date/:dayType", requireAuth, async (req, res) => {
    const { notes } = req.body;
    if (typeof notes !== "string") {
      return res.status(400).json({ error: "notes field required" });
    }
    const note = await storage.upsertSessionNote((req as any).userId, req.params.date, req.params.dayType, notes);
    res.json(note);
  });

  // Body weight
  app.get("/api/bodyweight", requireAuth, async (req, res) => {
    const entries = await storage.getBodyWeights((req as any).userId);
    res.json(entries);
  });

  app.post("/api/bodyweight", requireAuth, async (req, res) => {
    const { date, weight } = req.body;
    if (!date || weight === undefined || weight === null) {
      return res.status(400).json({ error: "date and weight required" });
    }
    const entry = await storage.createBodyWeight((req as any).userId, date, Number(weight));
    res.status(201).json(entry);
  });

  app.delete("/api/bodyweight/:id", requireAuth, async (req, res) => {
    await storage.deleteBodyWeight((req as any).userId, Number(req.params.id));
    res.status(204).send();
  });

  // CSV Export
  app.get("/api/export/csv", requireAuth, async (req, res) => {
    const logs = await storage.getWorkoutLogs((req as any).userId);
    const header = "date,dayType,exerciseName,sets,reps,weight,rpe";
    const rows = logs.map(l => {
      const name = l.exerciseName.includes(",") ? `"${l.exerciseName}"` : l.exerciseName;
      return `${l.date},${l.dayType},${name},${l.sets},${l.reps},${l.weight},${l.rpe}`;
    });
    const csv = [header, ...rows].join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=ppl-tracker-export.csv");
    res.send(csv);
  });
}
