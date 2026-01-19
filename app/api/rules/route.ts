import { getServerUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

type RulePayload = {
  phrase?: string;
  response?: string;
  enabled?: boolean;
  priority?: number;
};

export async function GET() {
  const user = await getServerUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rules = await prisma.responseRule.findMany({
    where: { userId: user.id },
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({ rules });
}

export async function POST(request: Request) {
  const user = await getServerUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as RulePayload;
  const phrase = body.phrase?.trim() ?? "";
  const response = body.response?.trim() ?? "";
  const enabled = body.enabled ?? true;
  const priority =
    typeof body.priority === "number" && Number.isFinite(body.priority)
      ? Math.floor(body.priority)
      : 0;

  if (!phrase || !response) {
    return NextResponse.json(
      { error: "Phrase and response are required." },
      { status: 400 },
    );
  }

  const rule = await prisma.responseRule.create({
    data: {
      userId: user.id,
      phrase,
      response,
      enabled,
      priority,
    },
  });

  return NextResponse.json({ rule });
}
