import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import db from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const users = db.prepare(`
    SELECT 
      u.email,
      u.created_at,
      u.is_beta,
      u.is_pro,
      (
        SELECT COUNT(*) FROM bugs b WHERE b.email = u.email
      ) as bug_count
    FROM users u
    ORDER BY u.created_at DESC
  `).all();

  return NextResponse.json(users);
}
