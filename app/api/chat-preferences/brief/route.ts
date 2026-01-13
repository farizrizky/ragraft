import { createGroq, groq } from "@ai-sdk/groq";
import { generateText, type CoreMessage } from "ai";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getAiSetup } from "@/lib/settings";
import { generateGoogleText } from "@/lib/google-ai";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const preferenceId = "default";
const minTemperature = 0;
const maxTemperature = 0.8;
const defaultModel = "llama-3.1-8b-instant";
const defaultProvider = "groq";

const defaultPreference = {
  name: "Assistant",
  tone: "Clear, concise, helpful",
  streamSpeed: "NORMAL",
  openingLine: "Hello! How can I help today?",
  temperature: 0.4,
};

function clampTemperature(value: number) {
  return Math.min(Math.max(value, minTemperature), maxTemperature);
}

function resolveProvider(value: string | null | undefined) {
  const normalized = (value ?? "").trim().toLowerCase();
  return normalized || defaultProvider;
}

function resolveModel(value: string | null | undefined) {
  return (value ?? "").trim() || defaultModel;
}

function buildGroqModel(model: string, apiKey: string | null) {
  if (apiKey) {
    return createGroq({ apiKey })(resolveModel(model));
  }
  return groq(resolveModel(model));
}

function buildBriefPrompt(preference: {
  name: string;
  tone: string;
  streamSpeed: string;
  openingLine: string;
  temperature: number;
}) {
  return [
    "You are a chat assistant configuration brief.",
    `Assistant name: ${preference.name}.`,
    `Language style: ${preference.tone}.`,
    `Stream speed: ${preference.streamSpeed}.`,
    `Opening line: ${preference.openingLine}.`,
    `Temperature: ${preference.temperature}.`,
    "Keep responses aligned with the configuration above.",
  ].join(" " );
}

async function buildOpeningMessage(preference: {
  name: string;
  tone: string;
  streamSpeed: string;
  openingLine: string;
  temperature: number;
  provider?: string | null;
  model?: string | null;
  apiKey?: string | null;
}) {
  const openingHint = preference.openingLine.trim();
  const userPrompt = openingHint
    ? `Write one short opening line using this hint: "${openingHint}".`
    : "Write one short opening line that greets the user.";

  const modelProvider = resolveProvider(preference.provider);
  if (modelProvider !== "groq" && modelProvider !== "google") {
    throw new Error("Provider is not supported.");
  }
  const messages: CoreMessage[] = [
    { role: "system", content: buildBriefPrompt(preference) },
    {
      role: "user",
      content: `${userPrompt} Return only the line.`,
    },
  ];

  if (modelProvider === "google") {
    if (!preference.apiKey) {
      throw new Error("AI provider API key is missing.");
    }
    return generateGoogleText({
      apiKey: preference.apiKey,
      model: resolveModel(preference.model),
      temperature: clampTemperature(preference.temperature),
      messages,
    });
  }

  const model = buildGroqModel(resolveModel(preference.model), preference.apiKey ?? null);
  const { text } = await generateText({
    model,
    temperature: clampTemperature(preference.temperature),
    messages,
  });

  return text.trim();
}

export async function GET() {
  const preference = await prisma.chatPreference.findUnique({
    where: { id: preferenceId },
  });

  const resolved = {
    name: preference?.name ?? defaultPreference.name,
    tone: preference?.tone ?? defaultPreference.tone,
    streamSpeed: preference?.streamSpeed ?? defaultPreference.streamSpeed,
    openingLine: preference?.openingLine ?? defaultPreference.openingLine,
    temperature: preference?.temperature ?? defaultPreference.temperature,
    provider: defaultProvider,
    model: defaultModel,
    apiKey: null as string | null,
  };

  try {
    const setup = await getAiSetup();
    resolved.provider = resolveProvider(setup.provider);
    resolved.model = resolveModel(setup.model);
    resolved.apiKey = setup.apiKey;
  } catch {
    resolved.provider = defaultProvider;
    resolved.model = defaultModel;
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
