import { getServerUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await getServerUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const dayStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [dayCount, weekCount, monthCount, totalCount, topQuestions, topKeywords] =
    await Promise.all([
      prisma.chatSession.count({
        where: { userId: user.id, startedAt: { gte: dayStart } },
      }),
      prisma.chatSession.count({
        where: { userId: user.id, startedAt: { gte: weekStart } },
      }),
      prisma.chatSession.count({
        where: { userId: user.id, startedAt: { gte: monthStart } },
      }),
      prisma.chatSession.count({ where: { userId: user.id } }),
      prisma.chatQuestion.findMany({
        where: { userId: user.id },
        orderBy: { count: "desc" },
        take: 5,
        select: { text: true, count: true },
      }),
      prisma.chatKeyword.findMany({
        where: { userId: user.id },
        orderBy: { count: "desc" },
        take: 5,
        select: { keyword: true, count: true },
      }),
    ]);

  return NextResponse.json({
    sessions: {
      day: dayCount,
      week: weekCount,
      month: monthCount,
      total: totalCount,
    },
    topQuestions,
    topKeywords,
  });
}
