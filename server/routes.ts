import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { insertWorkoutLogSchema } from "@shared/schema";

export async function registerRoutes(server: Server, app: Express) {
  // Get all workout logs
  app.get("/api/logs", async (_req, res) => {
    const logs = await storage.getWorkoutLogs();
    res.json(logs);
  });

  // Get logs by date
  app.get("/api/logs/date/:date", async (req, res) => {
    const logs = await storage.getWorkoutLogsByDate(req.params.date);
    res.json(logs);
  });

  // Get logs by date range
  app.get("/api/logs/range", async (req, res) => {
    const { start, end } = req.query;
    if (!start || !end) {
      return res.status(400).json({ error: "start and end query params required" });
    }
    const logs = await storage.getWorkoutLogsByDateRange(
      start as string,
      end as string
    );
    res.json(logs);
  });

  // Create a workout log
  app.post("/api/logs", async (req, res) => {
    const parsed = insertWorkoutLogSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const log = await storage.createWorkoutLog(parsed.data);
    res.status(201).json(log);
  });

  // Delete a workout log
  app.delete("/api/logs/:id", async (req, res) => {
    await storage.deleteWorkoutLog(req.params.id);
    res.status(204).send();
  });
}
