import { User, InsertUser, Transaction, InsertTransaction } from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte } from "drizzle-orm";
import { users, transactions } from "@shared/schema";
import session from "express-session";
import SQLiteStore from "better-sqlite3-session-store";
import Database from "better-sqlite3";

// Crear una instancia de Database para las sesiones
const sessionDb = new Database("sessions.db");
const SQLiteStoreFactory = SQLiteStore(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createTransaction(userId: number, transaction: InsertTransaction): Promise<Transaction>;
  getTransactions(userId: number, startDate: Date, endDate: Date): Promise<Transaction[]>;
  getCurrentBalance(userId: number): Promise<number>;
  deleteTransaction(userId: number, transactionId: number): Promise<void>;
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    // Inicializar el store con la instancia de la base de datos
    this.sessionStore = new SQLiteStoreFactory({
      client: sessionDb,
      expired: {
        clear: true,
        intervalMs: 900000 //ms = 15min
      }
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async createTransaction(userId: number, transaction: InsertTransaction): Promise<Transaction> {
    // Ensure date is a valid Date object
    const date = new Date(transaction.date);
    if (isNaN(date.getTime())) {
      throw new Error("Fecha inválida");
    }

    // Ensure amount is a valid number
    const amount = Math.round(Number(transaction.amount));
    if (isNaN(amount)) {
      throw new Error("Cantidad inválida");
    }

    const [newTransaction] = await db
      .insert(transactions)
      .values({
        ...transaction,
        userId,
        amount,
        date: date.getTime() // Store as timestamp for SQLite
      })
      .returning();
    return newTransaction;
  }

  async getTransactions(userId: number, startDate: Date, endDate: Date): Promise<Transaction[]> {
    // Ensure dates are valid Date objects
    if (!(startDate instanceof Date) || !(endDate instanceof Date)) {
      throw new Error("Las fechas deben ser objetos Date válidos");
    }

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error("Rango de fechas inválido");
    }

    // Convert dates to timestamps for SQLite
    const startTimestamp = startDate.getTime();
    const endTimestamp = endDate.getTime();

    const results = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          gte(transactions.date, startTimestamp),
          lte(transactions.date, endTimestamp)
        )
      )
      .orderBy(transactions.date);

    // Convert timestamps back to Date objects
    return results.map(t => ({
      ...t,
      date: new Date(t.date)
    }));
  }

  async getCurrentBalance(userId: number): Promise<number> {
    const allTransactions = await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId));

    return allTransactions.reduce((acc, t) => {
      return acc + (t.type === "payment" ? t.amount : -t.amount);
    }, 0);
  }

  async deleteTransaction(userId: number, transactionId: number): Promise<void> {
    // Verificar que la transacción pertenece al usuario antes de eliminar
    const [transaction] = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.id, transactionId),
          eq(transactions.userId, userId)
        )
      );

    if (!transaction) {
      throw new Error("Transacción no encontrada o no autorizada");
    }

    await db
      .delete(transactions)
      .where(
        and(
          eq(transactions.id, transactionId),
          eq(transactions.userId, userId)
        )
      );
  }
}

export const storage = new DatabaseStorage();