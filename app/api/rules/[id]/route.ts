import { getServerUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

type RulePayload = {
  phrase?: string;
  response?: string;
  enabled?: boolean;
  priority?: number;
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getServerUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resolvedParams = await params;
  if (!resolvedParams?.id) {
    return NextResponse.json({ error: "ID is required." }, { status: 400 });
  }

  const body = (await request.json()) as RulePayload;
  const updates: Record<string, unknown> = {};

  if (typeof body.phrase === "string") {
    updates.phrase = body.phrase.trim();
  }
  if (typeof body.response === "string") {
    updates.response = body.response.trim();
  }
  if (typeof body.enabled === "boolean") {
    updates.enabled = body.enabled;
  }
  if (typeof body.priority === "number" && Number.isFinite(body.priority)) {
    updates.priority = Math.floor(body.priority);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No updates provided." }, { status: 400 });
  }

  const rule = await prisma.responseRule.update({
    where: { id: resolvedParams.id, userId: user.id },
    data: updates,
  });

  return NextResponse.json({ rule });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getServerUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resolvedParams = await params;
  if (!resolvedParams?.id) {
    return NextResponse.json({ error: "ID is required." }, { status: 400 });
  }

  await prisma.responseRule.delete({
    where: { id: resolvedParams.id, userId: user.id },
  });

  return NextResponse.json({ ok: true });
}
