import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import db from "@/lib/db";

const LEMON_SIGNING_SECRET = process.env.LEMONSQUEEZY_WEBHOOK_SECRET!;

function verifySignature(req: NextRequest, body: string) {
  const signature = req.headers.get("x-signature") || "";

  if (!signature) {
    console.error("Missing x-signature header");
    return false;
  }

  if (!LEMON_SIGNING_SECRET) {
    console.error("❌ Webhook secret is not set in env");
    return false;
  }

  const hmac = crypto
    .createHmac("sha256", LEMON_SIGNING_SECRET)
    .update(body)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(hmac),
      Buffer.from(signature)
    );
  } catch {
    return false;
  }
}

function setStatus(email: string, status: string) {
  db.prepare(
    `UPDATE users SET subscription_status = ? WHERE email = ?`
  ).run(status, email);
}

export async function POST(req: NextRequest) {
  const body = await req.text();

  if (!verifySignature(req, body)) {
    console.error("Invalid Lemon Squeezy signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(body);
  const type = event.meta?.event_name;
  const email = event.data?.attributes?.user_email;
  const status = event.data?.attributes?.status; // Lemon status

  if (!email) {
    console.error("Webhook missing email:", event);
    return NextResponse.json({ error: "No email found" }, { status: 400 });
  }

  console.log("✅ Lemon Event Received:", type, "|", status, "|", email);

  try {
    switch (type) {
      // ========== ACTIVATION EVENTS ==========
      case "subscription_created":
      case "subscription_updated":
      case "subscription_payment_success":
        if (status === "active" || status === "paid" || status === "on_trial") {
          db.prepare(
            `UPDATE users SET is_pro = 1 WHERE email = ?`
          ).run(email);

          // Track status in DB
          setStatus(email, status === "on_trial" ? "trial" : "active");

          console.log(`✅ User upgraded to PRO: ${email} | status=${status}`);
        } else {
          console.log(`ℹ️ Ignored status: ${status} for ${email}`);
        }
        break;

      // ========== CANCEL CASES (YOU ASKED FOR THIS) ==========
      case "subscription_cancelled":
        if (status === "on_trial") {
          // ❌ CASE 1 — Trial cancelled → IMMEDIATE revoke
          db.prepare(
            `UPDATE users SET is_pro = 0 WHERE email = ?`
          ).run(email);

          setStatus(email, "cancelled");

          console.log(
            `❌ Trial cancelled → access revoked immediately: ${email}`
          );
        } else {
          // ✅ CASE 2 — Paid user cancelled → KEEP ACCESS till expiry
          setStatus(email, "cancelled");
          console.log(
            `ℹ️ Paid user cancelled → keeps access until expiry: ${email}`
          );
        }
        break;

      // ========== PAYMENT FAILURE (GRACE PERIOD) ==========
      case "subscription_payment_failed":
        // ❌ DO NOT downgrade yet
        setStatus(email, "payment_failed");
        console.warn(
          `⚠️ Payment failed (grace period) — keeping access: ${email}`
        );
        break;

      // ========== FINAL DOWNGRADE EVENTS ==========
      case "subscription_expired":
      case "order_refunded":
        db.prepare(
          `UPDATE users SET is_pro = 0 WHERE email = ?`
        ).run(email);

        setStatus(email, "expired");

        console.log(
          `❌ Subscription expired/refunded → access revoked: ${email}`
        );
        break;

      default:
        console.log("Unhandled Lemon event:", type);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
