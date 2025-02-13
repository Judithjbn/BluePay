import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from "@shared/schema";
import path from 'path';
import fs from 'fs';

// Crear el directorio data si no existe
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'local.db');
const sqlite = new Database(dbPath);
export const db = drizzle(sqlite, { schema });

// Inicializar las tablas si no existen
const createTablesSQL = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('payment', 'withdrawal')),
  description TEXT,
  payer TEXT,
  withdrawn_by TEXT,
  date INTEGER NOT NULL DEFAULT (unixepoch()),
  notes TEXT
);
`;

// Ejecutar las sentencias SQL
sqlite.exec(createTablesSQL);