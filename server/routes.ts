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

    try {
      const startDate = new Date(req.query.startDate as string);
      const endDate = new Date(req.query.endDate as string);

      // Validate dates
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({ message: "Invalid date format" });
      }

      const transactions = await storage.getTransactions(
        req.user!.id,
        startDate,
        endDate
      );

      res.json(transactions);
    } catch (error) {
      console.error("Error getting transactions:", error);
      res.status(500).json({ message: "Error retrieving transactions" });
    }
  });

  // Create new transaction
  app.post("/api/transactions", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const parsed = insertTransactionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(parsed.error);
    }

    try {
      const transaction = await storage.createTransaction(req.user!.id, parsed.data);
      res.status(201).json(transaction);
    } catch (error) {
      console.error("Error creating transaction:", error);
      res.status(500).json({ message: "Error creating transaction" });
    }
  });

  // Get current balance
  app.get("/api/balance", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const balance = await storage.getCurrentBalance(req.user!.id);
      res.json({ balance });
    } catch (error) {
      console.error("Error getting balance:", error);
      res.status(500).json({ message: "Error retrieving balance" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}