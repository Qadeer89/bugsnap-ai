import db from "./db";
import { sendNewUserNotification } from "./email";

export async function ensureUser(email: string) {
  const user = db
    .prepare("SELECT email FROM users WHERE email = ?")
    .get(email) as { email: string } | undefined;

  if (!user) {
    db.prepare(`
      INSERT INTO users (email, created_at, is_pro, is_beta)
      VALUES (?, ?, 0, 1)
    `).run(email, new Date().toISOString());

    // 📧 Notify admin
    await sendNewUserNotification(email);
  }
}
