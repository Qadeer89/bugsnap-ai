import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { ensureUser } from "@/lib/user";
import { isUserPro } from "@/lib/pro";
import { canGenerateForUser } from "@/lib/usage";
import { generateBugReport } from "@/lib/ai";
import { saveBugToHistory } from "@/lib/history";
import { extractTitleFromBug } from "@/lib/ai";
import { checkRateLimit } from "@/lib/rateLimit";
import { validateBase64Image } from "@/lib/imageGuard";
import { hashImage } from "@/lib/hash";
import { findCachedBug } from "@/lib/history";
import { isUserBeta } from "@/lib/beta";
import db from "@/lib/db";

/* ───────────────────────────
   Helpers to parse AI output
─────────────────────────── */
function extractSection(text: string, section: string) {
  const regex = new RegExp(`${section}:([\\s\\S]*?)(?=\\n[A-Z][a-zA-Z ]+:|$)`);
  const match = text.match(regex);
  return match ? match[1].trim() : "";
}

export async function POST(req: Request) {
  try {
    /* ───────────────────────────
       1️⃣ AUTH CHECK
    ─────────────────────────── */
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const email = session.user.email;

    /* ───────────────────────────
       1.5️⃣ RATE LIMIT CHECK
    ─────────────────────────── */
    const rate = checkRateLimit(email);

    if (!rate.allowed) {
      return NextResponse.json(
        {
          error: "RATE_LIMITED",
          message: "Too many requests. Please wait a minute.",
        },
        { status: 429 }
      );
    }

    /* ───────────────────────────
       2️⃣ GLOBAL KILL SWITCH
    ─────────────────────────── */
    if (process.env.AI_ENABLED !== "true") {
      return NextResponse.json(
        { error: "AI_DISABLED", message: "AI is temporarily disabled" },
        { status: 503 }
      );
    }

    /* ───────────────────────────
       3️⃣ ENSURE USER EXISTS
    ─────────────────────────── */
    await ensureUser(email);

    /* ───────────────────────────
       4️⃣ BETA ACCESS CHECK
    ─────────────────────────── */
    if (!isUserBeta(email)) {
      return NextResponse.json(
        { error: "NOT_IN_BETA" },
        { status: 403 }
      );
    }

    /* ───────────────────────────
       5️⃣ HARD DAILY LIMIT
    ─────────────────────────── */
    const isPro = isUserPro(email);
    const { allowed, remaining, limit } = canGenerateForUser(email, isPro);

    if (!allowed) {
      return NextResponse.json(
        {
          error: "LIMIT_REACHED",
          message: "Daily limit reached",
          remaining: 0,
          limit,
        },
        { status: 403 }
      );
    }

    /* ───────────────────────────
       6️⃣ REQUEST BODY
    ─────────────────────────── */
    const body = await req.json();

    if (!body.image) {
      return NextResponse.json(
        { error: "Image is required" },
        { status: 400 }
      );
    }

    /* ───────────────────────────
       7️⃣ IMAGE VALIDATION
    ─────────────────────────── */
    const validation = validateBase64Image(body.image);

    if (!validation.ok) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    /* ───────────────────────────
       8️⃣ DEDUPLICATION HASH
    ─────────────────────────── */
    const imageHash = hashImage(body.image);

    /* ───────────────────────────
       9️⃣ CACHE CHECK
    ─────────────────────────── */
    const cached = findCachedBug(email, imageHash);

    if (cached) {
      return NextResponse.json({
        result: cached.description,
        cached: true,
      });
    }

    /* ───────────────────────────
       🔟 DUMMY AI MODE
    ─────────────────────────── */
    if (process.env.USE_DUMMY_AI === "true") {
      const dummy = `
Title:
Unable to save user profile after updating email address

Preconditions:
- User is logged in
- Environment is QA

Steps to Reproduce:
1. Navigate to Profile page
2. Update email address
3. Click Save

Expected Result:
Profile should be saved successfully.

Actual Result:
Changes are not saved and no success message is shown.

Severity:
Major

Suspected Area:
Backend
      `.trim();

      const title = extractSection(dummy, "Title") || "Untitled bug";

      saveBugToHistory(email, title, dummy, imageHash);

      db.prepare(
        "UPDATE users SET total_generated = total_generated + 1 WHERE email = ?"
      ).run(email);

      return NextResponse.json({ result: dummy });
    }

    /* ───────────────────────────
       1️⃣1️⃣ REAL AI MODE
    ─────────────────────────── */
    const bug = await generateBugReport({
      imageBase64: body.image,
      intent: body.intent,
      environment: body.environment,
      browser: body.browser,
    });

    if (!bug) {
      return NextResponse.json(
        { error: "AI failed to generate bug" },
        { status: 500 }
      );
    }

    const title = extractTitleFromBug(bug) || "Untitled bug";

    // ✅ Save to history
    saveBugToHistory(email, title, bug, imageHash);
    db.prepare(`
      UPDATE users 
      SET total_generated = total_generated + 1 
      WHERE email = ?
    `).run(email);

    return NextResponse.json({ result: bug });

  } catch (error) {
    console.error("BugSnap API Error:", error);

    return NextResponse.json(
      { error: "Failed to generate bug" },
      { status: 500 }
    );
  }
}
