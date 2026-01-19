import {
  addSupermemoryDocument,
  deleteSupermemoryById,
  getSupermemoryMemoryId,
} from "@/lib/supermemory";
import { getServerUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import mammoth from "mammoth";
import pdfParse from "pdf-parse";
import { NextResponse } from "next/server";

const baseTag = process.env.SUPERMEMORY_CONTAINER_TAG?.trim() || "ragnara_default";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supportedTypes = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]);

async function extractTextFromFile(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());

  if (file.type === "application/pdf") {
    const pdf = await pdfParse(buffer);
    return pdf.text.trim();
  }

  if (
    file.type ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const docx = await mammoth.extractRawText({ buffer });
    return docx.value.trim();
  }

  return buffer.toString("utf-8").trim();
}

export async function GET() {
  const user = await getServerUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const items = await prisma.knowledgeFile.findMany({
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

  const formData = await request.formData();
  const file = formData.get("file");
  const title = formData.get("title");
  const tag = formData.get("tag");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "File is required." }, { status: 400 });
  }

  if (!supportedTypes.has(file.type)) {
    return NextResponse.json(
      { error: "Only PDF, DOCX, and TXT files are supported." },
      { status: 400 },
    );
  }

  const content = await extractTextFromFile(file);
  if (!content) {
    return NextResponse.json(
      { error: "Unable to extract text from file." },
      { status: 400 },
    );
  }

  const trimmedTag = typeof tag === "string" && tag.trim() ? tag.trim() : null;
  const finalTag = trimmedTag ?? baseTag;

  const supermemoryPayload = await addSupermemoryDocument(
    content,
    typeof title === "string" ? title : undefined,
    {
      containerTag: finalTag,
      tag: finalTag,
      userId: user.id,
    },
  );
  const memoryId = getSupermemoryMemoryId(supermemoryPayload);

  const item = await prisma.knowledgeFile.create({
    data: {
      userId: user.id,
      title: typeof title === "string" && title.trim() ? title.trim() : null,
      fileName: file.name,
      mimeType: file.type,
      size: file.size,
      tag: finalTag,
      memoryId,
    },
  });

  return NextResponse.json({ ok: true, item });
}

export async function DELETE(request: Request) {
  const user = await getServerUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { id?: string };
  if (!body.id) {
    return NextResponse.json({ error: "ID is required." }, { status: 400 });
  }

  try {
    const existing = await prisma.knowledgeFile.findUnique({
      where: { id: body.id },
    });

    if (existing) {
      if (existing.userId !== user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (existing.memoryId) {
        await deleteSupermemoryById(existing.memoryId, existing.userId);
      }
      await prisma.knowledgeFile.delete({
        where: { id: body.id },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete document.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
