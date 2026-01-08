export const dynamic = "force-dynamic";


import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import db, { todayKey } from "@/lib/db";
import { isUserPro } from "@/lib/pro";

const DAILY_LIMIT = 3;

export async function GET() {
  const session = await getServerSession(authOptions);

  // not logged in → no usage
  if (!session?.user?.email) {
    return NextResponse.json({
      count: 0,
      limit: DAILY_LIMIT,
    });
  }

  const email = session.user.email;

  // ✅ PRO USERS → UNLIMITED
  if (isUserPro(email)) {
    return NextResponse.json({
      count: 0,
      limit: Infinity,
    });
  }

  const today = todayKey();


  const row = db
    .prepare(
      `SELECT count FROM usage WHERE email = ? AND date = ?`
    )
    .get(email, today) as { count: number } | undefined;

  return NextResponse.json({
    count: row?.count ?? 0,
    limit: DAILY_LIMIT,
  });
}
