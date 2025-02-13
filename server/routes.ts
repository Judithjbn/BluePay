import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertTransactionSchema } from "@shared/schema";

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // Get transactions for a date range
  app.get("/api/transactions", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const startDate = new Date(req.query.startDate as string);
    const endDate = new Date(req.query.endDate as string);

    const transactions = await storage.getTransactions(
      req.user!.id,
      startDate,
      endDate
    );

    res.json(transactions);
  });

  // Create new transaction
  app.post("/api/transactions", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const parsed = insertTransactionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(parsed.error);
    }

    const transaction = await storage.createTransaction(req.user!.id, parsed.data);
    res.status(201).json(transaction);
  });

  // Get current balance
  app.get("/api/balance", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const balance = await storage.getCurrentBalance(req.user!.id);
    res.json({ balance });
  });

  const httpServer = createServer(app);
  return httpServer;
}
