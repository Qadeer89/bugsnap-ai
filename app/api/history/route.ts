export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import db from "@/lib/db";

const DEFAULT_PAGE_SIZE = 10;

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json(
      { items: [], total: 0, page: 1, pageSize: DEFAULT_PAGE_SIZE, hasMore: false },
      { status: 200 }
    );
  }

  const email = session.user.email;

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Math.min(
    50,
    Math.max(1, Number(searchParams.get("pageSize")) || DEFAULT_PAGE_SIZE)
  );

  const offset = (page - 1) * pageSize;

  // Total count (for pagination UI)
  const totalRow = db
    .prepare(`SELECT COUNT(*) as total FROM bugs WHERE email = ?`)
    .get(email) as { total: number };

  const total = totalRow?.total || 0;

  // Paginated items
  const items = db
    .prepare(`
      SELECT 
        id, 
        title, 
        description, 
        created_at, 
        is_pinned
      FROM bugs
      WHERE email = ?
      ORDER BY is_pinned DESC, datetime(created_at) DESC
      LIMIT ? OFFSET ?
    `)
    .all(email, pageSize, offset);

  const hasMore = offset + pageSize < total;

  return NextResponse.json({
    items,
    total,
    page,
    pageSize,
    hasMore,
  });
}
