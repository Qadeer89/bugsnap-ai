export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import db from "@/lib/db";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const email = session.user.email;
  const { id } = await params;
  const bugId = Number(id);

  if (!bugId || Number.isNaN(bugId)) {
    return NextResponse.json({ error: "INVALID_ID" }, { status: 400 });
  }

  const row = db
    .prepare(
      `SELECT id, title, created_at, is_pinned 
       FROM bugs 
       WHERE id = ? AND email = ?`
    )
    .get(bugId, email) as
    | { id: number; title: string; created_at: string; is_pinned: number }
    | undefined;

  if (!row) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const newValue = row.is_pinned ? 0 : 1;

  // ✅ FIX: removed updated_at (does not exist in your table)
  db.prepare(
    `UPDATE bugs 
     SET is_pinned = ?
     WHERE id = ? AND email = ?`
  ).run(newValue, bugId, email);

  return NextResponse.json({
    success: true,
    bug: {
      id: row.id,
      title: row.title,
      created_at: row.created_at,
      is_pinned: newValue,
    },
  });
}
