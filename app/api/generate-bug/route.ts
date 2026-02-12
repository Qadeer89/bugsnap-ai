export const maxDuration = 60;
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { ensureUser } from "@/lib/user";
import { isUserPro } from "@/lib/pro";
import { canGenerateForUser } from "@/lib/usage";
import { generateBugReport, extractTitleFromBug } from "@/lib/ai";
import { saveBugToHistory, findCachedBug } from "@/lib/history";
import { checkRateLimit } from "@/lib/rateLimit";
import { validateBase64Image } from "@/lib/imageGuard";
import { hashImage } from "@/lib/hash";
import { isUserBeta } from "@/lib/beta";
import db from "@/lib/db";

type Mode = "image" | "gif" | "scenario";

/* INPUT VALIDATION */
const requestSchema = z.object({
  mode: z.enum(["image", "gif", "scenario"]).optional(),
  image: z.string().nullable().optional(),
  scenario: z.string().optional(),
  intent: z.string().nullish(),
  environment: z.string().nullish(),
  browser: z.string().nullish(),
});

/* AI OUTPUT VALIDATION */
const bugSchema = z.object({
  title: z.string(),
  raw: z.string(),
  steps: z.array(z.string()).optional(),
  expected: z.string().optional(),
  actual: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const email = session.user.email;

    const rate = checkRateLimit(email);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "RATE_LIMITED" },
        { status: 429 }
      );
    }

    if (process.env.AI_ENABLED !== "true") {
      return NextResponse.json({ error: "AI_DISABLED" }, { status: 503 });
    }

    await ensureUser(email);

    if (!isUserBeta(email)) {
      return NextResponse.json({ error: "NOT_IN_BETA" }, { status: 403 });
    }

    let body;
    try {
      body = requestSchema.parse(await req.json());
    } catch {
      return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
    }

    const mode: Mode = body.mode || "image";
    const image = body.image;
    const scenario = body.scenario;

    let imageHash: string | null = null;

    if (mode === "scenario") {
      if (!scenario || scenario.trim().length < 10) {
        return NextResponse.json(
          { error: "Scenario too short" },
          { status: 400 }
        );
      }
    } else {
      if (!image) {
        return NextResponse.json(
          { error: "Image required" },
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

      const cached = findCachedBug(email, imageHash);
      if (cached) {
        return NextResponse.json({
          result: cached.description,
          cached: true,
        });
      }
    }

    const isPro = isUserPro(email);
    const { allowed } = canGenerateForUser(email, isPro);

    if (!allowed) {
      return NextResponse.json({ error: "LIMIT_REACHED" }, { status: 403 });
    }

    let bug: string | null = null;

    try {
      bug = await generateBugReport({
        mode,
        imageBase64: mode === "scenario" ? undefined : image ?? undefined,
        scenario,
        intent: body.intent || undefined,
        environment: body.environment || undefined,
        browser: body.browser || undefined,
      });
    } catch (e) {
      console.error("AI CALL ERROR:", e);
      return NextResponse.json({ error: "AI_FAILED" }, { status: 500 });
    }

    if (!bug || bug.trim().length === 0) {
      return NextResponse.json(
        { error: "AI_EMPTY_RESPONSE" },
        { status: 500 }
      );
    }

    const title = extractTitleFromBug(bug) || "Untitled bug";

    try {
      bugSchema.parse({
        title,
        raw: bug,
      });
    } catch (e) {
      console.error("AI OUTPUT INVALID:", e);
      return NextResponse.json(
        { error: "AI_OUTPUT_INVALID" },
        { status: 500 }
      );
    }

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
