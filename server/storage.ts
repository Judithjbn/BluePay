import { User, InsertUser, Transaction, InsertTransaction } from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte } from "drizzle-orm";
import { users, transactions } from "@shared/schema";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createTransaction(userId: number, transaction: InsertTransaction): Promise<Transaction>;
  getTransactions(userId: number, startDate: Date, endDate: Date): Promise<Transaction[]>;
  getCurrentBalance(userId: number): Promise<number>;
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true
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
        date // Use the validated date
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

    // Convert dates to UTC to match database storage
    const utcStart = new Date(startDate.toISOString());
    const utcEnd = new Date(endDate.toISOString());

    // Ensure end date includes the entire day
    utcEnd.setHours(23, 59, 59, 999);

    return await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          gte(transactions.date, utcStart),
          lte(transactions.date, utcEnd)
        )
      )
      .orderBy(transactions.date);
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
}

export const storage = new DatabaseStorage();