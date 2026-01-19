import {
  addSupermemoryDocument,
  getSupermemoryMemoryId,
} from "@/lib/supermemory";
import { getServerUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

const baseTag = process.env.SUPERMEMORY_CONTAINER_TAG?.trim() || "ragnara_default";

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
  const user = await getServerUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const items = await prisma.knowledgeText.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const user = await getServerUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  const title = body.title?.trim();
  const tag = body.tag?.trim() || null;

  const finalTag = tag ?? baseTag;
  const supermemoryPayload = await addSupermemoryDocument(
    buildSupermemoryContent(title, content),
    title,
    {
      containerTag: finalTag,
      tag: finalTag,
      userId: user.id,
    },
  );
  const memoryId = getSupermemoryMemoryId(supermemoryPayload);

  const item = await prisma.knowledgeText.create({
    data: {
      userId: user.id,
      title: title || null,
      content,
      tag: finalTag,
      memoryId,
    },
  });

  return NextResponse.json({ ok: true, item });
}
