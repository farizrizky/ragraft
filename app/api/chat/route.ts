import { createGroq, groq } from "@ai-sdk/groq";
import { generateText, type CoreMessage } from "ai";
import { searchSupermemory } from "@/lib/supermemory";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getAiSetup, getSupermemoryKey } from "@/lib/settings";
import { generateGoogleText } from "@/lib/google-ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const preferenceId = "default";
const minTemperature = 0;
const maxTemperature = 0.8;
const defaultTemperature = 0.4;
const defaultModel = "openai/gpt-oss-120b";
const defaultProvider = "groq";

type ChatMessage = CoreMessage;

function clampTemperature(value: number) {
  return Math.min(Math.max(value, minTemperature), maxTemperature);
}

function resolveProvider(value: string | null | undefined) {
  const normalized = (value ?? "").trim().toLowerCase();
  if (normalized === "groq" || normalized === "google") {
    return normalized;
  }
  return normalized || defaultProvider;
}

function resolveModel(value: string | null | undefined) {
  return (value ?? "").trim() || defaultModel;
}

function buildGroqModel(model: string, apiKey: string) {
  return createGroq({ apiKey })(resolveModel(model));
}

function normalizeTag(value: string) {
  return value.trim().toLowerCase();
}

export async function POST(request: Request) {
  const { messages } = (await request.json()) as {
    messages: ChatMessage[];
  };

  let temperature = defaultTemperature;
  let modelProvider = defaultProvider;
  let preferenceModel = defaultModel;
  let preferenceApiKey: string | null = null;

  try {
    const preference = await prisma.chatPreference.findUnique({
      where: { id: preferenceId },
    });
    if (preference?.temperature !== undefined) {
      temperature = clampTemperature(preference.temperature);
    }
  } catch {
    temperature = defaultTemperature;
  }

  try {
    const setup = await getAiSetup();
    modelProvider = resolveProvider(setup.provider);
    preferenceModel = resolveModel(setup.model);
    preferenceApiKey = setup.apiKey;
  } catch {
    modelProvider = defaultProvider;
    preferenceModel = defaultModel;
    preferenceApiKey = null;
  }

  if (modelProvider !== "groq" && modelProvider !== "google") {
    return NextResponse.json(
      { error: "Provider is not supported." },
      { status: 400 },
    );
  }

  if (!preferenceApiKey) {
    return NextResponse.json(
      { error: "AI provider API key is missing." },
      { status: 400 },
    );
  }

  const supermemoryKey = await getSupermemoryKey();
  if (!supermemoryKey) {
    return NextResponse.json(
      { error: "Supermemory API key is missing." },
      { status: 400 },
    );
  }

  const enrichedMessages = await enrichWithKnowledge(messages);
  let text = "";

  if (modelProvider === "groq") {
    const model = buildGroqModel(preferenceModel, preferenceApiKey);
    const response = await generateText({
      model,
      temperature,
      messages: enrichedMessages,
    });
    text = response.text;
  } else {
    text = await generateGoogleText({
      apiKey: preferenceApiKey,
      model: preferenceModel,
      temperature,
      messages: enrichedMessages,
    });
  }

  return NextResponse.json({ text });
}

function getTextFromContent(content: CoreMessage["content"]) {
  if (typeof content === "string") {
    return content;
  }
  if (!Array.isArray(content)) {
    return "";
  }
  return content
    .map((part) => {
      if (part.type === "text") {
        return part.text ?? "";
      }
      return "";
    })
    .join(" ")
    .trim();
}

async function enrichWithKnowledge(messages: CoreMessage[]): Promise<CoreMessage[]> {
  const lastUserMessage = [...messages]
    .reverse()
    .find((message) => message.role === "user");
  if (!lastUserMessage) {
    return messages;
  }

  const baseGuard =
    "You must answer using only the knowledge base provided. If the answer is not present, say you don't know.";
  const baseGuardMessage: CoreMessage = { role: "system", content: baseGuard };

  try {
    const query = getTextFromContent(lastUserMessage.content);
    if (!query) {
      return [baseGuardMessage, ...messages];
    }

    const queryLower = query.toLowerCase();
    const [fileItems, textItems] = await Promise.all([
      prisma.knowledgeFile.findMany({
        select: { tag: true },
      }),
      prisma.knowledgeText.findMany({
        select: { tag: true },
      }),
    ]);

    const allContainerTags = new Set<string>();
    const matchedContainerTags = new Set<string>();
    const items = [...fileItems, ...textItems];

    for (const item of items) {
      if (!item.tag) {
        continue;
      }
      const rawTag = item.tag.trim();
      if (!rawTag) {
        continue;
      }
      allContainerTags.add(rawTag);
      const tagKey = normalizeTag(rawTag);
      if (tagKey && queryLower.includes(tagKey)) {
        matchedContainerTags.add(rawTag);
      }
    }

    const containerTags =
      matchedContainerTags.size > 0
        ? [...matchedContainerTags]
        : [...allContainerTags];

    if (containerTags.length === 0) {
      return [baseGuardMessage, ...messages];
    }

    const chunks = await searchSupermemory(query, { containerTags });
    if (chunks.length === 0) {
      return [baseGuardMessage, ...messages];
    }

    const knowledgeBlock = chunks
      .slice(0, 6)
      .map((chunk, index) => `[#${index + 1}] ${chunk}`)
      .join("\n");

    const knowledgeMessage: CoreMessage = {
      role: "user",
      content: `Use the knowledge base below to answer the user question.\n\nKnowledge base:\n${knowledgeBlock}`,
    };

    return [baseGuardMessage, knowledgeMessage, ...messages];
  } catch {
    return [baseGuardMessage, ...messages];
  }
}
