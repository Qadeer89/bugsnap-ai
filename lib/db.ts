import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

const dbPath = path.join(dataDir, "bugsnap.db");
const db = new Database(dbPath);

/* USERS */
db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    email TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    is_pro INTEGER DEFAULT 0,
    is_beta INTEGER DEFAULT 0,
    total_generated INTEGER DEFAULT 0
  )
`).run();

/* USAGE */
db.prepare(`
  CREATE TABLE IF NOT EXISTS usage (
    email TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    count INTEGER NOT NULL
  )
`).run();

/* BUGS */
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

/* RATE LIMIT */
db.prepare(`
  CREATE TABLE IF NOT EXISTS rate_limit (
    email TEXT PRIMARY KEY,
    window_start INTEGER NOT NULL,
    count INTEGER NOT NULL
  )
`).run();

/* MIGRATIONS (safe) */
try {
  db.prepare(`ALTER TABLE users ADD COLUMN total_generated INTEGER DEFAULT 0`).run();
} catch {}

try {
  db.prepare(`ALTER TABLE bugs ADD COLUMN is_pinned INTEGER DEFAULT 0`).run();
} catch {}

/* EXPORT */
export default db;

console.log("USING DB FILE:", dbPath);


export function todayKey() {
  return new Date().toISOString().slice(0, 10);
}
