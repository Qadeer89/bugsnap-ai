import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import db from "@/lib/db";
import { isUserPro } from "@/lib/pro";
import { refreshJiraToken, clearJiraIntegration } from "@/lib/jiraOAuth";

/* ─────────────────────────── */
/* TYPES + HELPERS            */
/* ─────────────────────────── */

type JiraIntegration = {
  email: string;
  provider: string;
  type: string;
  base_url?: string | null;
  cloud_id?: string | null;
  site_url?: string | null;
  jira_site?: string | null;
  access_token: string;
  refresh_token?: string | null;
};

/**
 * Lightweight retry wrapper for health check
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  attempts = 2
): Promise<T> {
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === attempts - 1) throw err;
    }
  }
  throw new Error("Unreachable");
}

/**
 * Jira token health check
 */
async function jiraHealthCheck(
  integration: JiraIntegration
): Promise<{ ok: boolean; integration: JiraIntegration | null }> {
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
  const firstRes = await doCheck(integration.access_token);

  if (firstRes.ok) {
    return { ok: true, integration };
  }

  // If not auth error → treat as dead
  if (firstRes.status !== 401 && firstRes.status !== 403) {
    return { ok: false, integration: null };
  }

  // 2️⃣ Try silent refresh
  const refreshed = await refreshJiraToken(integration as any);
  if (!refreshed) {
    return { ok: false, integration: null };
  }

  // 3️⃣ Retry with new token
  const retryRes = await doCheck(refreshed.access_token);

  if (retryRes.ok) {
    return {
      ok: true,
      integration: { ...integration, ...refreshed },
    };
  }

  return { ok: false, integration: null };
}

/* ─────────────────────────── */
/* MAIN HANDLER               */
/* ─────────────────────────── */

export async function GET() {
  try {
    /* ───────── AUTH ───────── */
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ connected: false }, { status: 401 });
    }

    const email = session.user.email;

    /* ───────── PRO ONLY ───────── */
    if (!isUserPro(email)) {
      return NextResponse.json(
        { connected: false, error: "PRO_ONLY" },
        { status: 403 }
      );
    }

    /* ───────── LOAD INTEGRATION ───────── */
    let integration = db
      .prepare(
        `SELECT * FROM integrations WHERE email=? AND provider='jira' LIMIT 1`
      )
      .get(email) as JiraIntegration | undefined;

    if (!integration) {
      return NextResponse.json({
        connected: false,
        reason: "NOT_CONNECTED",
      });
    }

    /* ───────── REAL HEALTH CHECK (WITH RETRY) ───────── */
    const health = await withRetry(
      async () => jiraHealthCheck(integration!)
    );

    if (!health.ok) {
      // 💣 Token is dead → wipe it from DB (NEW, IMPORTANT)
      clearJiraIntegration(email);

      return NextResponse.json({
        connected: false,
        reason: "EXPIRED",
      });
    }

    // ✅ If token was refreshed, persist new tokens
    if (health.integration) {
      const updated = health.integration;

      db.prepare(
        `
        UPDATE integrations
        SET access_token = ?, refresh_token = ?, updated_at = ?
        WHERE email = ? AND provider = 'jira'
        `
      ).run(
        updated.access_token,
        updated.refresh_token || null,
        new Date().toISOString(),
        email
      );

      integration = updated;
    }

    return NextResponse.json({
      connected: true,
    });
  } catch (err) {
    console.error("Jira Status Error:", err);
    return NextResponse.json(
      { connected: false, reason: "FAILED" },
      { status: 500 }
    );
  }
}
