import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isUserPro } from "@/lib/pro";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const email = session.user.email;

  // 🔒 PRO ONLY
  const pro = isUserPro(email);
  if (!pro) {
    return NextResponse.json({ error: "PRO_ONLY" }, { status: 403 });
  }

  // 🔐 Build secure state
  const state = Buffer.from(
    JSON.stringify({
      email,
      ts: Date.now(),
    })
  ).toString("base64url");

  const params = new URLSearchParams({
    audience: "api.atlassian.com",
    client_id: process.env.JIRA_CLIENT_ID!,
    scope:
      "read:jira-user read:jira-work write:jira-work read:jira-board offline_access",
    redirect_uri: process.env.JIRA_REDIRECT_URI!,
    state,
    response_type: "code",

    // ✅ 🔥 FORCE ACCOUNT PICKER EVERY TIME
    prompt: "select_account consent",
  });

  const url = `https://auth.atlassian.com/authorize?${params.toString()}`;

  return NextResponse.redirect(url);
}
