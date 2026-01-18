import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import db from "@/lib/db";
import { isUserPro } from "@/lib/pro";
import { refreshJiraToken, clearJiraIntegration } from "@/lib/jiraOAuth";

async function jiraPost(url: string, integration: any, body: any) {
  const doPost = async (token: string) =>
    fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

  // 1️⃣ First attempt
  let res = await doPost(integration.access_token);

  if (res.status !== 401 && res.status !== 403) {
    return { res, integration };
  }

  // 2️⃣ Try silent refresh
  const refreshed = await refreshJiraToken(integration);
  if (!refreshed) {
    return { res: null, integration: null };
  }

  // 3️⃣ Retry with new token
  const retryRes = await doPost(refreshed.access_token);

  if (retryRes.status === 401 || retryRes.status === 403) {
    return { res: null, integration: null };
  }

  return {
    res: retryRes,
    integration: { ...integration, ...refreshed },
  };
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const email = session.user.email;

  if (!isUserPro(email)) {
    return NextResponse.json({ error: "PRO_ONLY" }, { status: 403 });
  }

  const body = await req.json();
  const {
    title,
    description,
    projectId,
    issueTypeId,
    priorityId,
    assigneeId,
    sprintId, // OPTIONAL
  } = body;

  if (!title || !description || !projectId || !issueTypeId) {
    return NextResponse.json(
      { error: "MISSING_REQUIRED_FIELDS" },
      { status: 400 }
    );
  }

  let integration = db
    .prepare(
      `SELECT * FROM integrations WHERE email=? AND provider='jira' LIMIT 1`
    )
    .get(email) as any;

  if (!integration) {
    return NextResponse.json(
      { error: "JIRA_NOT_CONNECTED" },
      { status: 400 }
    );
  }

  const base = `https://api.atlassian.com/ex/jira/${integration.cloud_id}`;

  // ─────────────────────────────────────
  // 1️⃣ Create issue
  // ─────────────────────────────────────
  const url = `${base}/rest/api/3/issue`;

  const fields: any = {
    summary: title,
    project: { id: projectId },
    issuetype: { id: issueTypeId },
    description: {
      type: "doc",
      version: 1,
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: description }],
        },
      ],
    },
  };

  if (priorityId) fields.priority = { id: priorityId };
  if (assigneeId) fields.assignee = { id: assigneeId };

  const r = await jiraPost(url, integration, { fields });

  if (r.integration) {
    integration = r.integration;
  }

  if (!r.res) {
    clearJiraIntegration(email);
    return NextResponse.json(
      { error: "JIRA_RECONNECT_REQUIRED" },
      { status: 401 }
    );
  }

  const data = await r.res.json();

  if (!r.res.ok) {
    return NextResponse.json(
      { error: "JIRA_CREATE_FAILED", details: data },
      { status: 400 }
    );
  }

  const issueKey = data.key;

  // ─────────────────────────────────────
  // 2️⃣ Add to sprint (OPTIONAL)
  // ─────────────────────────────────────
  if (sprintId) {
    try {
      const sprintUrl = `${base}/rest/agile/1.0/sprint/${sprintId}/issue`;

      const addRes = await jiraPost(sprintUrl, integration, {
        issues: [issueKey],
      });

      if (addRes.integration) {
        integration = addRes.integration;
      }

      if (!addRes.res) {
        clearJiraIntegration(email);
        return NextResponse.json(
          { error: "JIRA_RECONNECT_REQUIRED" },
          { status: 401 }
        );
      }

      if (!addRes.res.ok) {
        console.warn("Failed to add issue to sprint");
      }
    } catch (e) {
      console.warn("Sprint assignment failed", e);
    }
  }

  // ─────────────────────────────────────
  // 3️⃣ Build Jira URL
  // ─────────────────────────────────────
  const siteUrl =
    integration.site_url ||
    integration.base_url ||
    integration.jira_site ||
    "";

  const jiraUrl = siteUrl ? `${siteUrl}/browse/${issueKey}` : null;

  return NextResponse.json({
    jiraKey: issueKey,
    jiraUrl,
  });
}
