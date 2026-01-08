// lib/admin.ts

/**
 * Checks if the given email is the admin
 */
export function isAdmin(email?: string | null): boolean {
  if (!email) return false;

  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    throw new Error("ADMIN_EMAIL is not set in .env.local");
  }

  return email.toLowerCase() === adminEmail.toLowerCase();
}

/**
 * Email where notifications should be sent (new user signup, etc)
 */
export function getNotifyEmail(): string {
  const notifyEmail = process.env.NOTIFY_EMAIL;

  if (!notifyEmail) {
    throw new Error("NOTIFY_EMAIL is not set in .env.local");
  }

  return notifyEmail;
}
