import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  amount: integer("amount").notNull(), // Store in cents
  type: text("type", { enum: ["payment", "withdrawal"] }).notNull(),
  description: text("description"),
  payer: text("payer"), // For payments
  withdrawnBy: text("withdrawn_by"), // For withdrawals
  date: timestamp("date", { mode: "date" }).notNull().defaultNow(),
  notes: text("notes"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertTransactionSchema = createInsertSchema(transactions)
  .omit({ id: true, userId: true })
  .extend({
    amount: z.coerce.number().transform((val) => Math.round(val * 100)), // Convert dollars to cents
    date: z.coerce.date(),
  });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;