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
      throw new Error("Invalid date");
    }

    const [newTransaction] = await db
      .insert(transactions)
      .values({
        ...transaction,
        userId,
        date // Use the validated date
      })
      .returning();
    return newTransaction;
  }

  async getTransactions(userId: number, startDate: Date, endDate: Date): Promise<Transaction[]> {
    // Ensure dates are valid
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error("Invalid date range");
    }

    return await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          gte(transactions.date, start),
          lte(transactions.date, end)
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