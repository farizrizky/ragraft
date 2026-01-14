import {
  addSupermemoryDocument,
  deleteSupermemoryById,
  getSupermemoryMemoryId,
  updateSupermemoryDocument,
} from "@/lib/supermemory";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const baseTag = process.env.SUPERMEMORY_CONTAINER_TAG?.trim() || "ragnara_default";

function buildSupermemoryContent(title: string | undefined, content: string) {
  const trimmedTitle = title?.trim();
  if (trimmedTitle) {
    return `${trimmedTitle} - ${content}`;
  }
  return content;
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const resolvedParams = await params;
  if (!resolvedParams?.id) {
    return NextResponse.json({ error: "ID is required." }, { status: 400 });
  }
  const body = (await request.json()) as {
    content?: string;
    title?: string;
    tag?: string;
  };

  const content = body.content?.trim() ?? "";
  if (!content) {
    return NextResponse.json({ error: "Content is required." }, { status: 400 });
  }

  const existing = await prisma.knowledgeText.findUnique({
    where: { id: resolvedParams.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Knowledge not found." }, { status: 404 });
  }

  const title = body.title?.trim();
  const nextTag = body.tag?.trim() || existing.tag || baseTag;
  let memoryId = existing.memoryId ?? null;
  const supermemoryContent = buildSupermemoryContent(title, content);
  if (existing.memoryId) {
    await updateSupermemoryDocument(existing.memoryId, supermemoryContent, title, {
      containerTag: nextTag,
      tag: nextTag,
    });
  } else {
    const supermemoryPayload = await addSupermemoryDocument(supermemoryContent, title, {
      containerTag: nextTag,
      tag: nextTag,
    });
    memoryId = getSupermemoryMemoryId(supermemoryPayload);
  }

  const item = await prisma.knowledgeText.update({
    where: { id: resolvedParams.id },
    data: {
      title: title || null,
      content,
      tag: nextTag,
      memoryId,
    },
  });

  return NextResponse.json({ ok: true, item });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const resolvedParams = await params;
  if (!resolvedParams?.id) {
    return NextResponse.json({ error: "ID is required." }, { status: 400 });
  }
  const existing = await prisma.knowledgeText.findUnique({
    where: { id: resolvedParams.id },
  });

  if (existing) {
    if (existing.memoryId) {
      await deleteSupermemoryById(existing.memoryId);
    }
    await prisma.knowledgeText.delete({
      where: { id: resolvedParams.id },
    });
  }

  return NextResponse.json({ ok: true });
}
