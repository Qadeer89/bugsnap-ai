import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import db from "@/lib/db";

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const email = session.user.email;

  const bugId = Number(params.id); // ✅ correct

  if (Number.isNaN(bugId)) {
    return NextResponse.json({ error: "INVALID_ID" }, { status: 400 });
  }

  db.prepare(`
    DELETE FROM bugs
    WHERE id = ? AND email = ?
  `).run(bugId, email);

  return NextResponse.json({ success: true });
}
