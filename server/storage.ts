import { User, InsertUser, Transaction, InsertTransaction } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createTransaction(userId: number, transaction: InsertTransaction): Promise<Transaction>;
  getTransactions(userId: number, startDate: Date, endDate: Date): Promise<Transaction[]>;
  getCurrentBalance(userId: number): Promise<number>;
  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private transactions: Map<number, Transaction>;
  private currentUserId: number;
  private currentTransactionId: number;
  sessionStore: session.Store;

  constructor() {
    this.users = new Map();
    this.transactions = new Map();
    this.currentUserId = 1;
    this.currentTransactionId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createTransaction(userId: number, transaction: InsertTransaction): Promise<Transaction> {
    const id = this.currentTransactionId++;
    const newTransaction: Transaction = {
      ...transaction,
      id,
      userId,
    };
    this.transactions.set(id, newTransaction);
    return newTransaction;
  }

  async getTransactions(userId: number, startDate: Date, endDate: Date): Promise<Transaction[]> {
    return Array.from(this.transactions.values())
      .filter(
        (t) => 
          t.userId === userId && 
          t.date >= startDate && 
          t.date <= endDate
      )
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  async getCurrentBalance(userId: number): Promise<number> {
    return Array.from(this.transactions.values())
      .filter((t) => t.userId === userId)
      .reduce((acc, t) => {
        return acc + (t.type === "payment" ? t.amount : -t.amount);
      }, 0);
  }
}

export const storage = new MemStorage();
