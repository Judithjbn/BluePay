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
      const { startDate, endDate } = req.query;

      if (typeof startDate !== 'string' || typeof endDate !== 'string') {
        return res.status(400).json({ message: "Las fechas son requeridas" });
      }

      // Parse dates using the provided string format yyyy-MM-dd
      const parsedStartDate = new Date(startDate);
      const parsedEndDate = new Date(endDate);

      // Validate dates
      if (isNaN(parsedStartDate.getTime()) || isNaN(parsedEndDate.getTime())) {
        return res.status(400).json({ message: "Formato de fecha inválido" });
      }

      // Set time to start of day for start date and end of day for end date
      parsedStartDate.setUTCHours(0, 0, 0, 0);
      parsedEndDate.setUTCHours(23, 59, 59, 999);

      const transactions = await storage.getTransactions(
        req.user!.id,
        parsedStartDate,
        parsedEndDate
      );

      res.json(transactions);
    } catch (error) {
      console.error("Error getting transactions:", error);
      res.status(500).json({ message: "Error al obtener las transacciones" });
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
      res.status(500).json({ message: "Error al crear la transacción" });
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
      res.status(500).json({ message: "Error al obtener el balance" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}