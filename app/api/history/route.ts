export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import db from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json([], { status: 200 });
  }

  const email = session.user.email;

  const rows = db.prepare(`
    SELECT id, title, description, created_at, is_pinned
    FROM bugs
    WHERE email = ?
    ORDER BY is_pinned DESC, datetime(created_at) DESC
  `).all(email);

  return NextResponse.json(rows);
}
