import { getServerUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST() {
  const user = await getServerUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.$transaction([
    prisma.chatSession.deleteMany({ where: { userId: user.id } }),
    prisma.chatQuestion.deleteMany({ where: { userId: user.id } }),
    prisma.chatKeyword.deleteMany({ where: { userId: user.id } }),
  ]);

  return NextResponse.json({ ok: true });
}
