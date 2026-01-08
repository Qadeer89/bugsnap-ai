import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ensureUser } from "@/lib/user";
import db from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const email = session.user.email;

  // ✅ THIS IS THE FIX
  ensureUser(email);

  const user = db
    .prepare(`SELECT email, is_beta, is_pro FROM users WHERE email = ?`)
    .get(email) as any;

  return NextResponse.json({
    email: user.email,
    is_beta: !!user.is_beta,
    is_pro: !!user.is_pro,
  });
}
