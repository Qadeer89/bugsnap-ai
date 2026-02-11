import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

/**
 * ==========================
 *  DB INITIALIZATION
 * ==========================
 */

// Ensure data directory exists
const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// SQLite DB path
const dbPath = path.join(dataDir, "bugsnap.db");

// Create single shared DB instance (singleton pattern)
const db = new Database(dbPath, {
  verbose: process.env.NODE_ENV === "development" ? console.log : undefined,
  fileMustExist: false,
});

/**
 * ==========================
 *  TABLE CREATION (MIGRATIONS - SAFE)
 * ==========================
 */

// USERS TABLE
db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    email TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    is_pro INTEGER DEFAULT 0,
    is_beta INTEGER DEFAULT 0,
    total_generated INTEGER DEFAULT 0
  )
`).run();

// USAGE TABLE
db.prepare(`
  CREATE TABLE IF NOT EXISTS usage (
    email TEXT NOT NULL,
    date TEXT NOT NULL,
    count INTEGER NOT NULL,
    PRIMARY KEY (email, date)
  )
`).run();

// BUGS TABLE
db.prepare(`
  CREATE TABLE IF NOT EXISTS bugs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    image_hash TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at TEXT NOT NULL,
    is_pinned INTEGER DEFAULT 0
  )
`).run();

// RATE LIMIT TABLE (temporary, until Redis migration)
db.prepare(`
  CREATE TABLE IF NOT EXISTS rate_limit (
    email TEXT PRIMARY KEY,
    window_start INTEGER NOT NULL,
    count INTEGER NOT NULL
  )
`).run();

// INTEGRATIONS TABLE
db.prepare(`
  CREATE TABLE IF NOT EXISTS integrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,

    provider TEXT NOT NULL,      -- "jira"
    type TEXT NOT NULL,          -- "cloud" | "server"

    base_url TEXT,               -- for server Jira
    cloud_id TEXT,               -- for Jira Cloud

    access_token TEXT NOT NULL,
    refresh_token TEXT,

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`).run();

/**
 * ==========================
 *  SAFE MIGRATIONS (IF COLUMNS MISSING)
 * ==========================
 */

function safeAddColumn(table: string, column: string, definition: string) {
  try {
    db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
  } catch {
    // Column already exists - ignore
  }
}

// Ensure missing columns exist (backward compatibility)
safeAddColumn("users", "total_generated", "INTEGER DEFAULT 0");
safeAddColumn("bugs", "is_pinned", "INTEGER DEFAULT 0");

// 🔥🔥🔥 NEW — AUTOMATIC ONE-TIME MIGRATION FOR PROD 🔥🔥🔥
safeAddColumn("users", "subscription_status", "TEXT DEFAULT 'none'");

/**
 * ==========================
 *  HELPERS
 * ==========================
 */

export function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * ==========================
 *  EXPORT SINGLETON DB
 * ==========================
 */
export default db;
