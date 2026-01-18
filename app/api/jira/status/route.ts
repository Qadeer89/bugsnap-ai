import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import db from "@/lib/db";
import { isUserPro } from "@/lib/pro";
import { refreshJiraToken, clearJiraIntegration } from "@/lib/jiraOAuth";

async function jiraHealthCheck(integration: any) {
  const base = `https://api.atlassian.com/ex/jira/${integration.cloud_id}`;
  const testUrl = `${base}/rest/api/3/myself`;

  const doCheck = async (token: string) =>
    fetch(testUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

  // 1️⃣ First try
  let res = await doCheck(integration.access_token);

  if (res.ok) {
    return { ok: true, integration };
  }

  // If not auth error → treat as dead
  if (res.status !== 401 && res.status !== 403) {
    return { ok: false, integration: null };
  }

  // 2️⃣ Try silent refresh
  const refreshed = await refreshJiraToken(integration);
  if (!refreshed) {
    return { ok: false, integration: null };
  }

  // 3️⃣ Retry with new token
  res = await doCheck(refreshed.access_token);

  if (res.ok) {
    return {
      ok: true,
      integration: { ...integration, ...refreshed },
    };
  }

  return { ok: false, integration: null };
}

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ connected: false }, { status: 401 });
  }

  const email = session.user.email;

  // 🔒 PRO ONLY
  if (!isUserPro(email)) {
    return NextResponse.json({ error: "PRO_ONLY" }, { status: 403 });
  }

  let integration = db
    .prepare(
      `SELECT * FROM integrations WHERE email=? AND provider='jira' LIMIT 1`
    )
    .get(email) as any;

  if (!integration) {
    return NextResponse.json({ connected: false });
  }

  // 🧪 REAL token health check
  const health = await jiraHealthCheck(integration);

  if (!health.ok) {
    // 💣 Token is dead → wipe it
   

    return NextResponse.json({
      connected: false,
      reason: "EXPIRED",
    });
  }

  // ✅ Update in-memory integration if token refreshed
  if (health.integration) {
    integration = health.integration;
  }

  return NextResponse.json({
    connected: true,
  });
}
