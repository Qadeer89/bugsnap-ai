import db from "@/lib/db";

export function runMigrations() {
  console.log("🔧 Running DB migrations check...");

  try {
    db.prepare(`
      ALTER TABLE users
      ADD COLUMN subscription_status TEXT DEFAULT 'none';
    `).run();

    console.log("✅ Migration applied: added subscription_status to users");
  } catch (err: any) {
    // SQLite throws error if column already exists → ignore it
    if (err?.message?.includes("duplicate column name")) {
      console.log("ℹ️ subscription_status already exists — skipping.");
    } else {
      console.error("❌ Migration error:", err);
    }
  }
}
