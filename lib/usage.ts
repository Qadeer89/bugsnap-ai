import db, { todayKey } from "./db";

const FREE_DAILY_CAP = 3;
const PRO_DAILY_CAP = 30;

export function canGenerateForUser(email: string, isPro: boolean) {
  const today = todayKey();

  const record = db
    .prepare("SELECT count, date FROM usage WHERE email = ?")
    .get(email) as { count: number; date: string } | undefined;

  const DAILY_LIMIT = isPro ? PRO_DAILY_CAP : FREE_DAILY_CAP;

  // New day or no record → reset
  if (!record || record.date !== today) {
    db.prepare(
      "INSERT OR REPLACE INTO usage (email, date, count) VALUES (?, ?, ?)"
    ).run(email, today, 1);

    return { allowed: true, remaining: DAILY_LIMIT - 1, limit: DAILY_LIMIT };
  }

  // Hard cap reached
  if (record.count >= DAILY_LIMIT) {
    return { allowed: false, remaining: 0, limit: DAILY_LIMIT };
  }

  // Increment
  db.prepare("UPDATE usage SET count = count + 1 WHERE email = ?").run(email);

  return {
    allowed: true,
    remaining: DAILY_LIMIT - (record.count + 1),
    limit: DAILY_LIMIT,
  };
}
