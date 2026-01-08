import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import db from "@/lib/db";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const { email } = await req.json();

  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  const row = db
    .prepare("SELECT is_beta FROM users WHERE email = ?")
    .get(email) as { is_beta: number };

  const newValue = row?.is_beta === 1 ? 0 : 1;

  db.prepare("UPDATE users SET is_beta = ? WHERE email = ?").run(newValue, email);

  return NextResponse.json({ success: true, is_beta: newValue === 1 });
}
