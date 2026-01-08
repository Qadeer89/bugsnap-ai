import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import db from "@/lib/db";
import { isAdmin } from "@/lib/admin";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ email: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const { email } = await params;
  const decodedEmail = decodeURIComponent(email);

  const user = db
    .prepare(`SELECT is_beta FROM users WHERE email = ?`)
    .get(decodedEmail) as { is_beta: number } | undefined;

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const newValue = user.is_beta ? 0 : 1;

  db.prepare(`UPDATE users SET is_beta = ? WHERE email = ?`).run(
    newValue,
    decodedEmail
  );

  return NextResponse.json({ success: true });
}
