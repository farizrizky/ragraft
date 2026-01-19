import { getServerUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getAiSetup } from "@/lib/settings";
import {
  buildBriefPrompt,
  buildOpeningMessage,
  resolveBriefDefaults,
} from "@/lib/brief";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const defaultPreference = {
  name: "Assistant",
  tone: "Clear, concise, helpful",
  description: "",
  streamSpeed: "NORMAL",
  openingLine: "Hello! How can I help today?",
  temperature: 0.4,
};

export async function GET() {
  const user = await getServerUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const preference = await prisma.chatPreference.findUnique({
    where: { userId: user.id },
  });

  const resolved = {
    name: preference?.name ?? defaultPreference.name,
    tone: preference?.tone ?? defaultPreference.tone,
    description: preference?.description ?? defaultPreference.description,
    streamSpeed: preference?.streamSpeed ?? defaultPreference.streamSpeed,
    openingLine: preference?.openingLine ?? defaultPreference.openingLine,
    temperature: preference?.temperature ?? defaultPreference.temperature,
    ...resolveBriefDefaults(),
    apiKey: null as string | null,
  };

  try {
    const setup = await getAiSetup(user.id);
    resolved.provider = setup.provider;
    resolved.model = setup.model;
    resolved.apiKey = setup.apiKey;
  } catch {
    const fallback = resolveBriefDefaults();
    resolved.provider = fallback.provider;
    resolved.model = fallback.model;
    resolved.apiKey = null;
  }

  const prompt = buildBriefPrompt(resolved);
  let openingMessage = "";

  try {
    openingMessage = await buildOpeningMessage(resolved);
  } catch {
    const fallback = resolved.openingLine.trim();
    openingMessage = fallback
      ? `${fallback} - ${resolved.name}`
      : `Hello! I'm ${resolved.name}.`;
  }

  const { apiKey, ...safePreference } = resolved;

  return NextResponse.json({ prompt, preference: safePreference, openingMessage });
}
