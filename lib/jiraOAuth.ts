import db from "@/lib/db";

type IntegrationRow = {
  email: string;
  access_token: string;
  refresh_token: string;
  cloud_id: string;
};

/**
 * 🔁 Refresh access token using refresh token
 */
export async function refreshJiraToken(integration: IntegrationRow) {
  try {
    const params = new URLSearchParams();
    params.append("grant_type", "refresh_token");
    params.append("client_id", process.env.JIRA_CLIENT_ID!);
    params.append("client_secret", process.env.JIRA_CLIENT_SECRET!);
    params.append("refresh_token", integration.refresh_token);

    const res = await fetch("https://auth.atlassian.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!res.ok) {
      console.error("Jira refresh failed:", res.status);
      return null;
    }

    let data: any;
    try {
      data = await res.json();
    } catch {
      return null;
    }

    if (!data?.access_token || !data?.refresh_token) {
      return null;
    }

    // ✅ Update DB
    db.prepare(
      `
      UPDATE integrations
      SET access_token = ?, refresh_token = ?
      WHERE email = ? AND provider = 'jira'
    `
    ).run(data.access_token, data.refresh_token, integration.email);

    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    };
  } catch (e) {
    console.error("Jira refresh exception:", e);
    return null;
  }
}

/**
 * ❗ Only call this when USER clicks "Disconnect Jira"
 */
export function clearJiraIntegration(email: string) {
  db.prepare(`DELETE FROM integrations WHERE provider='jira' AND email=?`).run(
    email
  );
}

/**
 * 🩺 Jira health check
 * ❌ NEVER deletes integration
 */
export async function checkJiraHealth(integration: IntegrationRow) {
  const base = `https://api.atlassian.com/ex/jira/${integration.cloud_id}`;
  const testUrl = `${base}/rest/api/3/myself`;

  const tryFetch = async (token: string) =>
    fetch(testUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

  try {
    // 1️⃣ Try existing token
    let res = await tryFetch(integration.access_token);

    if (res.ok) {
      return { ok: true, integration };
    }

    // 2️⃣ Only try refresh on auth errors
    if (res.status !== 401 && res.status !== 403) {
      return { ok: false };
    }

    // 3️⃣ Try refresh
    const refreshed = await refreshJiraToken(integration);
    if (!refreshed) {
      return { ok: false };
    }

    // 4️⃣ Retry with new token
    const retry = await tryFetch(refreshed.access_token);
    if (retry.ok) {
      return {
        ok: true,
        integration: { ...integration, ...refreshed },
      };
    }

    return { ok: false };
  } catch (e) {
    console.error("Jira health check exception:", e);
    return { ok: false };
  }
}
