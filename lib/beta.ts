import db from "./db";

export function isUserBeta(email: string): boolean {
  const row = db
    .prepare("SELECT is_beta FROM users WHERE email = ?")
    .get(email) as { is_beta: number } | undefined;

  return row?.is_beta === 1;
}
