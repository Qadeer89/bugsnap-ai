import db from "./db";

/* ─────────────────────────────
   Find cached bug by image hash
───────────────────────────── */
export function findCachedBug(email: string, imageHash: string) {
  return db
    .prepare(
      `
      SELECT id, title, description
      FROM bugs
      WHERE email = ? AND image_hash = ?
    `
    )
    .get(email, imageHash) as
    | { id: number; title: string; description: string }
    | undefined;
}

/* ─────────────────────────────
   Save bug to history
───────────────────────────── */
export function saveBugToHistory(
  email: string,
  title: string,
  description: string,
  imageHash: string
) {
  db.prepare(
    `
    INSERT INTO bugs (email, image_hash, title, description, created_at)
    VALUES (?, ?, ?, ?, ?)
  `
  ).run(email, imageHash, title, description, new Date().toISOString());
}

/* ─────────────────────────────
   Get bug history for UI
───────────────────────────── */
export function getBugHistory(email: string) {
  return db
    .prepare(
      `
      SELECT id, title, description, created_at, is_pinned
      FROM bugs
      WHERE email = ?
      ORDER BY is_pinned DESC, created_at DESC
      LIMIT 50
    `
    )
    .all(email);
}
