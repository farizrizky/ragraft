import {
  addSupermemoryDocument,
  getSupermemoryMemoryId,
} from "@/lib/supermemory";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

const baseTag = process.env.SUPERMEMORY_CONTAINER_TAG?.trim() || "ragraft_default";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function buildSupermemoryContent(title: string | undefined, content: string) {
  const trimmedTitle = title?.trim();
  if (trimmedTitle) {
    return `${trimmedTitle} - ${content}`;
  }
  return content;
}

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
    tag?: string;
  };

  const content = body.content?.trim() ?? "";
  if (!content) {
    return NextResponse.json({ error: "Content is required." }, { status: 400 });
  }

  const title = body.title?.trim();
  const tag = body.tag?.trim() || null;

  const finalTag = tag ?? baseTag;
  const supermemoryPayload = await addSupermemoryDocument(
    buildSupermemoryContent(title, content),
    title,
    {
    containerTag: finalTag,
    tag: finalTag,
    },
  );
  const memoryId = getSupermemoryMemoryId(supermemoryPayload);

  const item = await prisma.knowledgeText.create({
    data: {
      title: title || null,
      content,
      tag: finalTag,
      memoryId,
    },
  });

  return NextResponse.json({ ok: true, item });
}
