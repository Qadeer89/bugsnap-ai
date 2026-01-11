import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

async function safeSend(payload: any, label: string) {
  try {
    const res = await resend.emails.send(payload);
    console.log(`✅ Email sent: ${label}`, res);
  } catch (err) {
    console.error(`❌ Email FAILED: ${label}`, err);
  }
}

export async function sendNewUserNotification(userEmail: string) {
  if (!process.env.NOTIFY_EMAIL) return;

  await safeSend({
    from: "BugSnap <noreply@bugsnap-ai.com>",
    to: process.env.NOTIFY_EMAIL,
    subject: "🆕 New BugSnap User Signup",
    html: `
      <h3>New user signed up</h3>
      <p><strong>Email:</strong> ${userEmail}</p>
      <p>Status: Pending approval</p>
    `,
  }, "Admin New User Notification");
}

export async function sendBetaApprovedEmail(email: string) {
  await safeSend({
    from: "BugSnap <noreply@bugsnap-ai.com>",
    to: email,
    subject: "✅ Your BugSnap Beta Access Is Approved",
    html: `
      <h2>Welcome to BugSnap AI 🎉</h2>
      <p>Your beta access has been approved.</p>
      <a href="https://www.bugsnap-ai.com">Open BugSnap AI</a>
    `,
  }, "Beta Approved");
}

export async function sendBetaRevokedEmail(email: string) {
  await safeSend({
    from: "BugSnap <noreply@bugsnap-ai.com>",
    to: email,
    subject: "⚠️ Your BugSnap Beta Access Was Revoked",
    html: `
      <h2>Access Update</h2>
      <p>Your beta access has been revoked by admin.</p>
    `,
  }, "Beta Revoked");
}

export async function sendProEnabledEmail(email: string) {
  await safeSend({
    from: "BugSnap <noreply@bugsnap-ai.com>",
    to: email,
    subject: "🚀 BugSnap Pro Enabled",
    html: `
      <h2>You're now a Pro user 🚀</h2>
      <p>Enjoy unlimited bug generation!</p>
    `,
  }, "Pro Enabled");
}

export async function sendProRevokedEmail(email: string) {
  await safeSend({
    from: "BugSnap <noreply@bugsnap-ai.com>",
    to: email,
    subject: "⚠️ BugSnap Pro Disabled",
    html: `
      <h2>Subscription Update</h2>
      <p>Your Pro access has been disabled.</p>
    `,
  }, "Pro Revoked");
}
