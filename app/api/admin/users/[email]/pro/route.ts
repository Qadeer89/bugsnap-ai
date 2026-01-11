import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import db from "@/lib/db";
import { isAdmin } from "@/lib/admin";
import {
  sendBetaApprovedEmail,
  sendBetaRevokedEmail,
  sendProEnabledEmail,
  sendProRevokedEmail
} from "@/lib/email";


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
    .prepare(`SELECT is_pro FROM users WHERE email = ?`)
    .get(decodedEmail) as { is_pro: number } | undefined;

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const oldValue = user.is_pro;
  const newValue = oldValue ? 0 : 1;

  db.prepare(`UPDATE users SET is_pro = ? WHERE email = ?`).run(
   newValue,
   decodedEmail
 );

 // 📧 Send email
 if (oldValue === 0 && newValue === 1) {
   await sendProEnabledEmail(decodedEmail);
 }

 if (oldValue === 1 && newValue === 0) {
   await sendProRevokedEmail(decodedEmail);
 }

 return NextResponse.json({ success: true });

}
