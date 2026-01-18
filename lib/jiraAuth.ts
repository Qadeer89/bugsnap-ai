import db from "@/lib/db";

export function clearJiraIntegration(email: string) {
  try {
    db.prepare(
      `DELETE FROM integrations WHERE provider='jira' AND email=?`
    ).run(email);
  } catch {}
}
