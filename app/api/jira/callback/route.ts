import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (!code || !state) {
    return NextResponse.json({ error: "Missing code/state" }, { status: 400 });
  }

  // 1️⃣ Decode state
  const decoded = JSON.parse(
    Buffer.from(state, "base64").toString("utf-8")
  );

  const email = decoded.email;

  // 2️⃣ Exchange code for token
  const tokenRes = await fetch("https://auth.atlassian.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: process.env.JIRA_CLIENT_ID,
      client_secret: process.env.JIRA_CLIENT_SECRET,
      code,
      redirect_uri: process.env.JIRA_REDIRECT_URI,
    }),
  });

  const tokenData = await tokenRes.json();

  if (!tokenData.access_token) {
    console.error("Jira token error:", tokenData);
    return NextResponse.json({ error: "Token exchange failed" }, { status: 500 });
  }

  const accessToken = tokenData.access_token;
  const refreshToken = tokenData.refresh_token || null;

  // 3️⃣ Get cloudId
  const cloudRes = await fetch(
    "https://api.atlassian.com/oauth/token/accessible-resources",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  const clouds = await cloudRes.json();

  if (!clouds || !clouds.length) {
    return NextResponse.json({ error: "No Jira sites found" }, { status: 400 });
  }

  const cloudId = clouds[0].id;

  // 4️⃣ Save to DB
  const now = new Date().toISOString();

  db.prepare(`
    INSERT OR REPLACE INTO integrations
    (
      email,
      provider,
      type,
      cloud_id,
      base_url,
      access_token,
      refresh_token,
      created_at,
      updated_at
    )
    VALUES (?, 'jira', 'cloud', ?, NULL, ?, ?, ?, ?)
  `).run(
    email,
    cloudId,
    accessToken,
    refreshToken,
    now,
    now
  );

  // ✅ 5️⃣ Redirect back CLEAN (NO QUERY PARAMS)
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

  return NextResponse.redirect(baseUrl);
}
