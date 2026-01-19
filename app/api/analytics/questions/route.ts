import { getServerUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

const PAGE_SIZE = 10;

export async function GET(request: Request) {
  const user = await getServerUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get("page") ?? "1") || 1;
  const skip = Math.max(0, page - 1) * PAGE_SIZE;

  const [total, items] = await Promise.all([
    prisma.chatQuestion.count({ where: { userId: user.id } }),
    prisma.chatQuestion.findMany({
      where: { userId: user.id },
      orderBy: { count: "desc" },
      skip,
      take: PAGE_SIZE,
      select: { text: true, count: true, lastAskedAt: true },
    }),
  ]);

  return NextResponse.json({
    total,
    page,
    pageSize: PAGE_SIZE,
    items,
  });
}
