import db from "./db";

const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 5; // 5 per minute per user

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
};

/**
 * Centralized helper to avoid duplicate SQL
 */
function getWindow(email: string) {
  return db
    .prepare(
      "SELECT window_start, count FROM rate_limit WHERE email = ?"
    )
    .get(email) as
    | { window_start: number; count: number }
    | undefined;
}

/**
 * Creates a fresh rate-limit window
 */
function createWindow(email: string, now: number) {
  db.prepare(
    "INSERT INTO rate_limit (email, window_start, count) VALUES (?, ?, ?)"
  ).run(email, now, 1);

  return {
    allowed: true,
    remaining: MAX_REQUESTS - 1,
  };
}

/**
 * Resets an expired window
 */
function resetWindow(email: string, now: number) {
  db.prepare(
    "UPDATE rate_limit SET window_start = ?, count = ? WHERE email = ?"
  ).run(now, 1, email);

  return {
    allowed: true,
    remaining: MAX_REQUESTS - 1,
  };
}

/**
 * Core rate-limit function
 */
export function checkRateLimit(email: string): RateLimitResult {
  const now = Date.now();

  const row = getWindow(email);

  // Case 1 — No record → new window
  if (!row) {
    return createWindow(email, now);
  }

  const elapsed = now - row.window_start;

  // Case 2 — Window expired → reset
  if (elapsed > WINDOW_MS) {
    return resetWindow(email, now);
  }

  // Case 3 — Limit reached → block
  if (row.count >= MAX_REQUESTS) {
    return {
      allowed: false,
      remaining: 0,
    };
  }

  // Case 4 — Within window → increment
  db.prepare(
    "UPDATE rate_limit SET count = count + 1 WHERE email = ?"
  ).run(email);

  return {
    allowed: true,
    remaining: MAX_REQUESTS - (row.count + 1),
  };
}
