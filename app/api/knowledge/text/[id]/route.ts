import { addSupermemoryDocument } from "@/lib/supermemory";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(
  request: Request,
  { params }: { params: { id: string } },
) {
  const body = (await request.json()) as {
    content?: string;
    title?: string;
  };

  const content = body.content?.trim() ?? "";
  if (!content) {
    return NextResponse.json({ error: "Content is required." }, { status: 400 });
  }

  const existing = await prisma.knowledgeText.findUnique({
    where: { id: params.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Knowledge not found." }, { status: 404 });
  }

  const title = body.title?.trim();
  await addSupermemoryDocument(content, title, {
    containerTag: existing.containerTag,
  });

  const item = await prisma.knowledgeText.update({
    where: { id: params.id },
    data: {
      title: title || null,
      content,
    },
  });

  return NextResponse.json({ ok: true, item });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const existing = await prisma.knowledgeText.findUnique({
    where: { id: params.id },
  });

  if (existing) {
    await prisma.knowledgeText.delete({
      where: { id: params.id },
    });
  }

  return NextResponse.json({ ok: true });
}
