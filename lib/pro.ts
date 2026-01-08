import db from "./db";

/**
 * Check if a user is Pro
 */
export function isUserPro(email: string): boolean {
  const row = db
    .prepare("SELECT is_pro FROM users WHERE email = ?")
    .get(email) as { is_pro: number } | undefined;

  return row?.is_pro === 1;
}
