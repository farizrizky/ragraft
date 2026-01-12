import { addSupermemoryDocument } from "@/lib/supermemory";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

const containerTag = process.env.SUPERMEMORY_CONTAINER_TAG?.trim() || "ragraft_default";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const items = await prisma.knowledgeText.findMany({
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    content?: string;
    title?: string;
  };

  const content = body.content?.trim() ?? "";
  if (!content) {
    return NextResponse.json({ error: "Content is required." }, { status: 400 });
  }

  const title = body.title?.trim();

  await addSupermemoryDocument(content, title, { containerTag });

  const item = await prisma.knowledgeText.create({
    data: {
      title: title || null,
      content,
      containerTag,
    },
  });

  return NextResponse.json({ ok: true, item });
}
