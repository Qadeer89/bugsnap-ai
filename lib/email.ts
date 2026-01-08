import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendNewUserNotification(userEmail: string) {
  if (!process.env.NOTIFY_EMAIL) return;

  try {
    await resend.emails.send({
      from: "BugSnap <onboarding@resend.dev>",
      to: process.env.NOTIFY_EMAIL,
      subject: "🆕 New BugSnap User Signup",
      html: `
        <h3>New user signed up</h3>
        <p><strong>Email:</strong> ${userEmail}</p>
        <p>Status: Pending approval</p>
      `,
    });
  } catch (err) {
    console.error("❌ Failed to send admin notification email:", err);
  }
}
