import db from "./db";

const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 5; // 5 per minute per user

export function checkRateLimit(email: string) {
  const now = Date.now();

  const row = db
    .prepare("SELECT window_start, count FROM rate_limit WHERE email = ?")
    .get(email) as { window_start: number; count: number } | undefined;

  // No record → create new window
  if (!row) {
    db.prepare(
      "INSERT INTO rate_limit (email, window_start, count) VALUES (?, ?, ?)"
    ).run(email, now, 1);

    return { allowed: true, remaining: MAX_REQUESTS - 1 };
  }

  // Window expired → reset
  if (now - row.window_start > WINDOW_MS) {
    db.prepare(
      "UPDATE rate_limit SET window_start = ?, count = ? WHERE email = ?"
    ).run(now, 1, email);

    return { allowed: true, remaining: MAX_REQUESTS - 1 };
  }

  // Limit hit
  if (row.count >= MAX_REQUESTS) {
    return { allowed: false, remaining: 0 };
  }

  // Increment
  db.prepare(
    "UPDATE rate_limit SET count = count + 1 WHERE email = ?"
  ).run(email);

  return {
    allowed: true,
    remaining: MAX_REQUESTS - (row.count + 1),
  };
}
