import db from "./db";

const DAILY_LIMIT = 3;

export async function canGenerateForUser(email: string) {
  const today = new Date().toISOString().slice(0, 10);

  const row = db
    .prepare(
      `SELECT count FROM usage WHERE email = ? AND date = ?`
    )
    .get(email, today) as { count: number } | undefined;

  if (!row) {
    db.prepare(
      `INSERT INTO usage (email, date, count) VALUES (?, ?, 1)`
    ).run(email, today);

    return { allowed: true, remaining: DAILY_LIMIT - 1 };
  }

  if (row.count >= DAILY_LIMIT) {
    return { allowed: false, remaining: 0 };
  }

  db.prepare(
    `UPDATE usage SET count = count + 1 WHERE email = ? AND date = ?`
  ).run(email, today);

  return {
    allowed: true,
    remaining: DAILY_LIMIT - (row.count + 1),
  };
}
