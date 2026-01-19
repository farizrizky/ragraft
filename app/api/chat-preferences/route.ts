import { getServerUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import type { StreamSpeed as PrismaStreamSpeed } from "@prisma/client";
import { NextResponse } from "next/server";

const allowedSpeeds = ["INSTANT", "SLOW", "FAST", "NORMAL"] as const;
type StreamSpeed = (typeof allowedSpeeds)[number];
const minTemperature = 0;
const maxTemperature = 0.8;

type PreferencePayload = {
  name?: string;
  tone?: string;
  description?: string;
  chatLogoUrl?: string;
  headerColor?: string;
  headerTextColor?: string;
  streamSpeed?: string;
  openingLine?: string;
  temperature?: number;
  developerMode?: boolean;
  maxOutputTokens?: number;
  historyMessageLimit?: number;
  ragMaxChunks?: number;
  ragChunkMaxChars?: number;
  ragMaxContextChars?: number;
};

const defaultPreference = {
  name: "Assistant",
  tone: "Clear, concise, helpful",
  description: "",
  chatLogoUrl: "",
  headerColor: "#1f4bd8",
  headerTextColor: "#ffffff",
  streamSpeed: "NORMAL" as const,
  openingLine: "Hello! How can I help today?",
  temperature: 0.4,
  developerMode: false,
  maxOutputTokens: null as number | null,
  historyMessageLimit: null as number | null,
  ragMaxChunks: null as number | null,
  ragChunkMaxChars: null as number | null,
  ragMaxContextChars: null as number | null,
};

function isNumericCode(value: string) {
  return /^[0-9]+$/.test(value);
}

async function generatePublicCode() {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const code = Math.floor(10000000 + Math.random() * 90000000).toString();
    const existing = await prisma.chatPreference.findUnique({
      where: { publicCode: code },
      select: { id: true },
    });
    if (!existing) {
      return code;
    }
  }
  return `${Date.now()}`.replace(/\D/g, "").slice(-10);
}

function clampTemperature(value: number) {
  return Math.min(Math.max(value, minTemperature), maxTemperature);
}

function isStreamSpeed(value: string): value is StreamSpeed {
  return allowedSpeeds.includes(value as StreamSpeed);
}

export async function GET() {
  const user = await getServerUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let preference = await prisma.chatPreference.findUnique({
    where: { userId: user.id },
  });

  if (!preference) {
    const publicCode = await generatePublicCode();
    preference = await prisma.chatPreference.create({
      data: {
        ...defaultPreference,
        userId: user.id,
        publicCode,
      },
    });
  } else if (!preference.publicCode || !isNumericCode(preference.publicCode)) {
    const publicCode = await generatePublicCode();
    preference = await prisma.chatPreference.update({
      where: { userId: user.id },
      data: { publicCode },
    });
  }

  return NextResponse.json({ preference });
}

export async function POST(request: Request) {
  const user = await getServerUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as PreferencePayload;

  const name = (body.name ?? "").trim();
  const tone = (body.tone ?? "").trim();
  const description = (body.description ?? "").trim();
  const chatLogoUrl = (body.chatLogoUrl ?? "").trim();
  const headerColor = (body.headerColor ?? "").trim();
  const headerTextColor = (body.headerTextColor ?? "").trim();
  const openingLine = (body.openingLine ?? "").trim();
  const streamSpeedInput = body.streamSpeed ?? "NORMAL";
  const rawTemperature = typeof body.temperature === "number" ? body.temperature : 0.4;
  const temperature = clampTemperature(rawTemperature);
  const developerMode =
    typeof body.developerMode === "boolean" ? body.developerMode : false;
  const maxOutputTokens =
    typeof body.maxOutputTokens === "number" && Number.isFinite(body.maxOutputTokens)
      ? Math.max(0, Math.floor(body.maxOutputTokens))
      : 0;
  const historyMessageLimit =
    typeof body.historyMessageLimit === "number" && Number.isFinite(body.historyMessageLimit)
      ? Math.max(0, Math.floor(body.historyMessageLimit))
      : 0;
  const ragMaxChunks =
    typeof body.ragMaxChunks === "number" && Number.isFinite(body.ragMaxChunks)
      ? Math.max(0, Math.floor(body.ragMaxChunks))
      : 0;
  const ragChunkMaxChars =
    typeof body.ragChunkMaxChars === "number" && Number.isFinite(body.ragChunkMaxChars)
      ? Math.max(0, Math.floor(body.ragChunkMaxChars))
      : 0;
  const ragMaxContextChars =
    typeof body.ragMaxContextChars === "number" && Number.isFinite(body.ragMaxContextChars)
      ? Math.max(0, Math.floor(body.ragMaxContextChars))
      : 0;

  if (!isStreamSpeed(streamSpeedInput)) {
    return NextResponse.json(
      { error: "Invalid stream speed." },
      { status: 400 },
    );
  }

  const streamSpeed = streamSpeedInput as PrismaStreamSpeed;
  let preference = await prisma.chatPreference.upsert({
    where: { userId: user.id },
    update: {
      name,
      tone,
      description,
      chatLogoUrl,
      headerColor,
      headerTextColor,
      openingLine,
      streamSpeed,
      temperature,
      developerMode,
      maxOutputTokens: maxOutputTokens > 0 ? maxOutputTokens : null,
      historyMessageLimit: historyMessageLimit > 0 ? historyMessageLimit : null,
      ragMaxChunks: ragMaxChunks > 0 ? ragMaxChunks : null,
      ragChunkMaxChars: ragChunkMaxChars > 0 ? ragChunkMaxChars : null,
      ragMaxContextChars: ragMaxContextChars > 0 ? ragMaxContextChars : null,
    },
    create: {
      name,
      tone,
      description,
      chatLogoUrl,
      headerColor,
      headerTextColor,
      openingLine,
      streamSpeed,
      temperature,
      developerMode,
      maxOutputTokens: maxOutputTokens > 0 ? maxOutputTokens : null,
      historyMessageLimit: historyMessageLimit > 0 ? historyMessageLimit : null,
      ragMaxChunks: ragMaxChunks > 0 ? ragMaxChunks : null,
      ragChunkMaxChars: ragChunkMaxChars > 0 ? ragChunkMaxChars : null,
      ragMaxContextChars: ragMaxContextChars > 0 ? ragMaxContextChars : null,
      userId: user.id,
    },
  });

  if (!preference.publicCode || !isNumericCode(preference.publicCode)) {
    const publicCode = await generatePublicCode();
    preference = await prisma.chatPreference.update({
      where: { userId: user.id },
      data: { publicCode },
    });
  }

  return NextResponse.json({ preference });
}
