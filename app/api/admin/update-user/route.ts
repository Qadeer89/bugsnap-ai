import db from "@/lib/db";
import {
  sendBetaApprovedEmail,
  sendBetaRevokedEmail,
  sendProEnabledEmail,
  sendProRevokedEmail
} from "@/lib/email";

export async function POST(req: Request) {
  const { email, is_beta, is_pro } = await req.json();

  const user = db.prepare(
    "SELECT is_beta, is_pro FROM users WHERE email = ?"
  ).get(email) as any;

  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  // Update DB
  db.prepare(
    "UPDATE users SET is_beta = ?, is_pro = ? WHERE email = ?"
  ).run(is_beta ? 1 : 0, is_pro ? 1 : 0, email);

  // 🧠 Detect changes & send emails

  if (!user.is_beta && is_beta) {
    await sendBetaApprovedEmail(email);
  }

  if (user.is_beta && !is_beta) {
    await sendBetaRevokedEmail(email);
  }

  if (!user.is_pro && is_pro) {
    await sendProEnabledEmail(email);
  }

  if (user.is_pro && !is_pro) {
    await sendProRevokedEmail(email);
  }

  return Response.json({ success: true });
}
