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

  // Create a workout log
  app.post("/api/logs", requireAuth, async (req, res) => {
    const parsed = insertWorkoutLogSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const log = await storage.createWorkoutLog((req as any).userId, parsed.data);
    res.status(201).json(log);
  });

  // Delete a workout log
  app.delete("/api/logs/:id", requireAuth, async (req, res) => {
    await storage.deleteWorkoutLog((req as any).userId, req.params.id);
    res.status(204).send();
  });
}
