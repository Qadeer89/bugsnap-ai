
export const runtime = "nodejs";


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

type Mode = "image" | "gif" | "scenario";

/* ─────────────────────────── */
function extractSection(text: string, section: string) {
  const regex = new RegExp(`${section}:([\\s\\S]*?)(?=\\n[A-Z][a-zA-Z ]+:|$)`);
  const match = text.match(regex);
  return match ? match[1].trim() : "";
}

export async function POST(req: Request) {
  try {
    /* ───────── AUTH ───────── */
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
    const email = session.user.email;

    /* ───────── RATE LIMIT ───────── */
    const rate = checkRateLimit(email);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "RATE_LIMITED", message: "Too many requests" },
        { status: 429 }
      );
    }

    /* ───────── GLOBAL SWITCH ───────── */
    if (process.env.AI_ENABLED !== "true") {
      return NextResponse.json(
        { error: "AI_DISABLED" },
        { status: 503 }
      );
    }

    /* ───────── USER ───────── */
    await ensureUser(email);

    if (!isUserBeta(email)) {
      return NextResponse.json({ error: "NOT_IN_BETA" }, { status: 403 });
    }

    /* ───────── BODY ───────── */
    const body = await req.json();

    const mode: Mode = body.mode || "image";
    const image = body.image;
    const scenario = body.scenario;

    let imageHash: string | null = null;

    /* ───────── VALIDATION ───────── */
    if (mode === "scenario") {
      if (!scenario || scenario.trim().length < 10) {
        return NextResponse.json(
          { error: "Scenario description is required" },
          { status: 400 }
        );
      }
    } else {
      if (!image) {
        return NextResponse.json(
          { error: "Image/GIF is required" },
          { status: 400 }
        );
      }

      const validation = validateBase64Image(image);
      if (!validation.ok) {
        return NextResponse.json(
          { error: validation.error },
          { status: 400 }
        );
      }

      imageHash = hashImage(image);

      /* ✅ CACHE CHECK FIRST */
      const cached = findCachedBug(email, imageHash);
      if (cached) {
        return NextResponse.json({
          result: cached.description,
          cached: true,
        });
      }
    }

    /* ───────── DAILY LIMIT (AFTER CACHE) ───────── */
    const isPro = isUserPro(email);
    const { allowed, limit } = canGenerateForUser(email, isPro);

    if (!allowed) {
      return NextResponse.json(
        { error: "LIMIT_REACHED", limit },
        { status: 403 }
      );
    }

    /* ───────── DUMMY MODE ───────── */
    if (process.env.USE_DUMMY_AI === "true") {
      const dummy = `
Title:
Unable to save user profile after updating email address

Preconditions:
- User is logged in

Steps to Reproduce:
1. Go to profile
2. Update email
3. Click save

Expected Result:
Profile saved

Actual Result:
Not saved

Severity:
Major

Suspected Area:
Backend
      `.trim();

      const title = extractSection(dummy, "Title") || "Untitled bug";

      saveBugToHistory(email, title, dummy, imageHash || "SCENARIO");

      db.prepare(
        "UPDATE users SET total_generated = total_generated + 1 WHERE email = ?"
      ).run(email);

      return NextResponse.json({ result: dummy });
    }

    /* ───────── REAL AI ───────── */
    const bug = await generateBugReport({
      mode,
      imageBase64: mode === "scenario" ? undefined : image,
      scenario,
      intent: body.intent,
      environment: body.environment,
      browser: body.browser,
    });

    if (!bug) {
      return NextResponse.json({ error: "AI_FAILED" }, { status: 500 });
    }

    const title = extractTitleFromBug(bug) || "Untitled bug";

    saveBugToHistory(email, title, bug, imageHash || "SCENARIO");

    db.prepare(
      "UPDATE users SET total_generated = total_generated + 1 WHERE email = ?"
    ).run(email);

    return NextResponse.json({ result: bug });

  } catch (err) {
    console.error("BugSnap API Error:", err);
    return NextResponse.json({ error: "FAILED" }, { status: 500 });
  }
}
