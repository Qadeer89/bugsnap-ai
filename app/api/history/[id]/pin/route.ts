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

  // ✅ IMPORTANT
  const { id } = await params;
  const bugId = Number(id);

  const row = db
    .prepare(`SELECT is_pinned FROM bugs WHERE id = ? AND email = ?`)
    .get(bugId, email) as { is_pinned: number } | undefined;

  if (!row) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const newValue = row.is_pinned ? 0 : 1;

  db.prepare(`
    UPDATE bugs SET is_pinned = ? WHERE id = ? AND email = ?
  `).run(newValue, bugId, email);

  return NextResponse.json({ success: true, is_pinned: newValue });
}
