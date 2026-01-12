import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import db, { todayKey } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  
  const today = todayKey();
  const users = db.prepare(`
    SELECT 
     u.email,
     u.created_at,
     u.is_beta,
     u.is_pro,
     u.total_generated as total_bugs,
     COALESCE((
      SELECT count FROM usage 
      WHERE usage.email = u.email AND usage.date = ?
     ), 0) as today_bugs
    FROM users u
    ORDER BY u.created_at DESC
  `).all(today);


  return NextResponse.json(users);
}
