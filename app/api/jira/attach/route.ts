import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import db from "@/lib/db";
import { isUserPro } from "@/lib/pro";
import { refreshJiraToken, clearJiraIntegration } from "@/lib/jiraOAuth";

async function jiraPostAttachment(
  url: string,
  integration: any,
  formData: FormData
) {
  const doPost = async (token: string) =>
    fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Atlassian-Token": "no-check",
      },
      body: formData,
    });

  // 1️⃣ First try
  let res = await doPost(integration.access_token);

  if (res.status !== 401 && res.status !== 403) {
    return { res, integration };
  }

  // 2️⃣ Try silent refresh
  const refreshed = await refreshJiraToken(integration);
  if (!refreshed) {
    return { res: null, integration: null };
  }

  // 3️⃣ Retry
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
  const { issueKey, base64Image } = body;

  if (!issueKey || !base64Image) {
    return NextResponse.json(
      { error: "MISSING_REQUIRED_FIELDS" },
      { status: 400 }
    );
  }

  // 🛡️ Size guard (prevent abuse / crashes)
  if (base64Image.length > 10_000_000) {
    return NextResponse.json({ error: "IMAGE_TOO_LARGE" }, { status: 413 });
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

  // 🧠 Decode base64
  const matches = base64Image.match(/^data:(.+);base64,(.+)$/);
  if (!matches) {
    return NextResponse.json({ error: "INVALID_IMAGE" }, { status: 400 });
  }

  const mime = matches[1];
  const buffer = Buffer.from(matches[2], "base64");

  const form = new FormData();
  form.append(
    "file",
    new Blob([buffer], { type: mime }),
    mime.includes("gif") ? "bug.gif" : "bug.png"
  );

  const url = `https://api.atlassian.com/ex/jira/${integration.cloud_id}/rest/api/3/issue/${issueKey}/attachments`;

  const r = await jiraPostAttachment(url, integration, form);

  if (r.integration) {
    integration = r.integration;
  }

  // 🔥 Token is dead even after refresh
  if (!r.res) {
    clearJiraIntegration(email);
    return NextResponse.json(
      { error: "JIRA_RECONNECT_REQUIRED" },
      { status: 401 }
    );
  }

  if (!r.res.ok) {
    const t = await r.res.text();
    return NextResponse.json(
      { error: "ATTACH_FAILED", details: t },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
}
