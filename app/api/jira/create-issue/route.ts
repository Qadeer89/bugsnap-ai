import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import db from "@/lib/db";
import { isUserPro } from "@/lib/pro";
import { refreshJiraToken } from "@/lib/jiraOAuth";

/* ─────────────────────────── */
/* TYPES + VALIDATION (NEW)   */
/* ─────────────────────────── */

const requestSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(5),
  projectId: z.string(),
  issueTypeId: z.string(),
  priorityId: z.string().optional(),
  assigneeId: z.string().nullable().optional(),
  sprintId: z.string().nullable().optional(),
});

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

/* ─────────────────────────── */
/* RETRY HELPER (NEW)         */
/* ─────────────────────────── */

async function withRetry<T>(
  fn: () => Promise<T>,
  attempts = 3
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

/* ─────────────────────────── */
/* JIRA POST WITH TOKEN REFRESH */
/* ─────────────────────────── */

async function jiraPost(
  url: string,
  integration: JiraIntegration,
  body: any
): Promise<{ res: Response | null; integration: JiraIntegration | null }> {
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
  const refreshed = await refreshJiraToken(integration as any);
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

/* ─────────────────────────── */
/* MAIN HANDLER               */
/* ─────────────────────────── */

export async function POST(req: Request) {
  try {
    /* ───────── AUTH (HARD BLOCK) ───────── */
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
    const email = session.user.email;

    /* ───────── PRO CHECK ───────── */
    if (!isUserPro(email)) {
      return NextResponse.json({ error: "PRO_ONLY" }, { status: 403 });
    }

    /* ───────── BODY PARSE + VALIDATE ───────── */
    let body;
    try {
      body = requestSchema.parse(await req.json());
    } catch {
      return NextResponse.json(
        { error: "INVALID_REQUEST" },
        { status: 400 }
      );
    }

    const {
      title,
      description,
      projectId,
      issueTypeId,
      priorityId,
      assigneeId,
      sprintId,
    } = body;

    /* ───────── LOAD JIRA INTEGRATION ───────── */
    let integration = db
      .prepare(
        `SELECT * FROM integrations WHERE email=? AND provider='jira' LIMIT 1`
      )
      .get(email) as JiraIntegration | undefined;

    if (!integration) {
      return NextResponse.json(
        { error: "JIRA_NOT_CONNECTED" },
        { status: 400 }
      );
    }

    const base = `https://api.atlassian.com/ex/jira/${integration.cloud_id}`;

    /* ───────────────────────────────────── */
    /* 1️⃣ CREATE ISSUE (WITH RETRY)       */
    /* ───────────────────────────────────── */

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

    const r = await withRetry(async () =>
      jiraPost(url, integration!, { fields })
    );

    if (r.integration) {
      integration = r.integration;
    }

    if (!r.res) {
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

    /* ───────────────────────────────────── */
    /* 2️⃣ ADD TO SPRINT (OPTIONAL)        */
    /* ───────────────────────────────────── */

    if (sprintId) {
      try {
        const sprintUrl = `${base}/rest/agile/1.0/sprint/${sprintId}/issue`;

        const addRes = await withRetry(async () =>
          jiraPost(sprintUrl, integration!, {
            issues: [issueKey],
          })
        );

        if (addRes.integration) {
          integration = addRes.integration;
        }

        if (!addRes.res) {
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

    /* ───────────────────────────────────── */
    /* 3️⃣ BUILD JIRA URL                  */
    /* ───────────────────────────────────── */

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
  } catch (err) {
    console.error("Jira Create Error:", err);
    return NextResponse.json({ error: "FAILED" }, { status: 500 });
  }
}
