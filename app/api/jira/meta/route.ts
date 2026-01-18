export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import db from "@/lib/db";
import { isUserPro } from "@/lib/pro";
import { refreshJiraToken } from "@/lib/jiraOAuth";

/**
 * Safe Jira fetch with auto refresh
 */
async function jiraFetch(url: string, integration: any) {
  const doFetch = (token: string) =>
    fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

  let res = await doFetch(integration.access_token);

  if (res.ok) {
    return { ok: true, res, integration };
  }

  if (res.status !== 401 && res.status !== 403) {
    return { ok: false };
  }

  const refreshed = await refreshJiraToken(integration);
  if (!refreshed) {
    return { ok: false };
  }

  const retryRes = await doFetch(refreshed.access_token);
  if (!retryRes.ok) {
    return { ok: false };
  }

  return {
    ok: true,
    res: retryRes,
    integration: { ...integration, ...refreshed },
  };
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const email = session.user.email;

    if (!isUserPro(email)) {
      return NextResponse.json({ error: "PRO_ONLY" }, { status: 403 });
    }

    let integration = db
      .prepare(
        `SELECT * FROM integrations WHERE email=? AND provider='jira' LIMIT 1`
      )
      .get(email) as any;

    if (!integration) {
      return NextResponse.json(
        { error: "JIRA_NOT_CONNECTED" },
        { status: 401 }
      );
    }

    const base = `https://api.atlassian.com/ex/jira/${integration.cloud_id}`;

    const { searchParams } = new URL(req.url);
    let projectId = searchParams.get("projectId");

    // ─────────────────────────────────────
    // 1️⃣ Projects
    // ─────────────────────────────────────
    const p1 = await jiraFetch(
      `${base}/rest/api/3/project/search`,
      integration
    );

    if (!p1.ok || !p1.res) {
      return NextResponse.json(
        { error: "JIRA_RECONNECT_REQUIRED" },
        { status: 401 }
      );
    }

    integration = p1.integration;
    const projectsData = await p1.res.json();
    const projects = projectsData?.values || [];

    if (!projectId && projects.length) {
      projectId = String(projects[0].id);
    }

    // ─────────────────────────────────────
    // 2️⃣ Issue Types
    // ─────────────────────────────────────
    let issueTypes: any[] = [];

    if (projectId) {
      const p2 = await jiraFetch(
        `${base}/rest/api/3/issuetype/project?projectId=${projectId}`,
        integration
      );

      if (!p2.ok || !p2.res) {
        return NextResponse.json(
          { error: "JIRA_RECONNECT_REQUIRED" },
          { status: 401 }
        );
      }

      const raw = await p2.res.json();
      issueTypes = Array.isArray(raw) ? raw : raw?.values || [];
    }

    // ─────────────────────────────────────
    // 3️⃣ Priorities
    // ─────────────────────────────────────
    const p3 = await jiraFetch(`${base}/rest/api/3/priority`, integration);
    if (!p3.ok || !p3.res) {
      return NextResponse.json(
        { error: "JIRA_RECONNECT_REQUIRED" },
        { status: 401 }
      );
    }

    const prioritiesRaw = await p3.res.json();
    const priorities = Array.isArray(prioritiesRaw) ? prioritiesRaw : [];

    // ─────────────────────────────────────
    // 4️⃣ Users
    // ─────────────────────────────────────
    const p4 = await jiraFetch(
      `${base}/rest/api/3/users/search?maxResults=50`,
      integration
    );

    if (!p4.ok || !p4.res) {
      return NextResponse.json(
        { error: "JIRA_RECONNECT_REQUIRED" },
        { status: 401 }
      );
    }

    const usersRaw = await p4.res.json();
    const assignees = Array.isArray(usersRaw)
      ? usersRaw.map((u) => ({
          id: u.accountId,
          name: u.displayName || u.emailAddress || "User",
        }))
      : [];

    // ─────────────────────────────────────
    // 5️⃣ Sprints (SCRUM BOARDS ONLY)
    // ─────────────────────────────────────
    let sprints: { id: string; name: string }[] = [];

    try {
      if (projectId) {
        // 5.1 Get ALL boards
        const b1 = await jiraFetch(
          `${base}/rest/agile/1.0/board?maxResults=100`,
          integration
        );

        if (b1.ok && b1.res) {
          const boardsData = await b1.res.json();
          const boards = boardsData?.values || [];

          // 5.2 Find board for this project
          const board = boards.find(
            (b: any) =>
              String(b?.location?.projectId) === String(projectId)
          );

          if (board) {
            const boardId = board.id;

            // 5.3 Get active + future sprints
            const s1 = await jiraFetch(
              `${base}/rest/agile/1.0/board/${boardId}/sprint?state=active,future`,
              integration
            );

            if (s1.ok && s1.res) {
              const sprintData = await s1.res.json();
              const rawSprints = sprintData?.values || [];

              sprints = rawSprints.map((s: any) => ({
                id: String(s.id),
                name: s.name,
              }));
            }
          }
        }
      }
    } catch (e) {
      console.warn("Sprint fetch failed, ignoring", e);
    }

    // ─────────────────────────────────────
    // ✅ Final response
    // ─────────────────────────────────────
    return NextResponse.json({
      projects: projects.map((p: any) => ({ id: p.id, name: p.name })),
      issueTypes: issueTypes.map((i: any) => ({ id: i.id, name: i.name })),
      priorities: priorities.map((p: any) => ({ id: p.id, name: p.name })),
      assignees,
      sprints,
    });
  } catch (e) {
    console.error("META ROUTE CRASH:", e);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
