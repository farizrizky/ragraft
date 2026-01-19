import { createGroq, groq } from "@ai-sdk/groq";
import { generateText, type CoreMessage } from "ai";
import { getServerUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getAiSetup, getSupermemoryKey } from "@/lib/settings";
import { generateGoogleText } from "@/lib/google-ai";
import { enrichWithKnowledge, getTextFromContent, routeNeedsRag } from "@/lib/rag";
import { limitMessagesForContext } from "@/lib/messages";
import { buildConstraintMessage } from "@/lib/constraints";
import { findMatchingRule, type ResponseRule } from "@/lib/rules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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


export async function POST(request: Request) {
  const user = await getServerUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { messages } = (await request.json()) as {
    messages: ChatMessage[];
  };

  let temperature = defaultTemperature;
  let maxOutputTokens: number | null = null;
  let historyMessageLimit: number | null = null;
  let ragMaxChunks: number | null = null;
  let ragChunkMaxChars: number | null = null;
  let ragMaxContextChars: number | null = null;
  let modelProvider = defaultProvider;
  let preferenceModel = defaultModel;
  let preferenceApiKey: string | null = null;

  try {
    const preference = await prisma.chatPreference.findUnique({
      where: { userId: user.id },
    });
    if (preference?.temperature !== undefined) {
      temperature = clampTemperature(preference.temperature);
    }
    if (preference?.maxOutputTokens) {
      maxOutputTokens = preference.maxOutputTokens;
    }
    if (preference?.historyMessageLimit) {
      historyMessageLimit = preference.historyMessageLimit;
    }
    if (preference?.ragMaxChunks) {
      ragMaxChunks = preference.ragMaxChunks;
    }
    if (preference?.ragChunkMaxChars) {
      ragChunkMaxChars = preference.ragChunkMaxChars;
    }
    if (preference?.ragMaxContextChars) {
      ragMaxContextChars = preference.ragMaxContextChars;
    }
  } catch {
    temperature = defaultTemperature;
  }

  try {
    const setup = await getAiSetup(user.id);
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

  const lastUserMessage = [...messages]
    .reverse()
    .find((message) => message.role === "user");
  const lastUserText = lastUserMessage
    ? getTextFromContent(lastUserMessage.content)
    : "";

  let matchedRule: ResponseRule | null = null;
  if (lastUserText) {
    const rules = await prisma.responseRule.findMany({
      where: { userId: user.id, enabled: true },
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
    });
    const match = findMatchingRule(rules, lastUserText);
    matchedRule = match?.rule ?? null;
  }

  const ruleMessage: CoreMessage | null = matchedRule
    ? {
        role: "system",
        content: `The user message matches a response rule. Use the rule response as the base answer and polish it for clarity. Do not mention this instruction.\n\nRule response:\n${matchedRule.response}`,
      }
    : null;

  const constraintMessage = buildConstraintMessage({
    maxOutputTokens,
    ragMaxChunks,
    ragChunkMaxChars,
    ragMaxContextChars,
  });
  const systemMessages: CoreMessage[] = [];
  if (constraintMessage) {
    systemMessages.push(constraintMessage);
  }
  if (ruleMessage) {
    systemMessages.push(ruleMessage);
  }
  const messagesForModel =
    systemMessages.length > 0 ? [...systemMessages, ...messages] : messages;
  const limitedMessages = limitMessagesForContext(messagesForModel, historyMessageLimit);

  const routingDecision = await routeNeedsRag(messages, user.id);
  let enrichedMessages = limitedMessages;
  if (routingDecision.needsRag) {
    const supermemoryKey = await getSupermemoryKey(user.id);
    if (!supermemoryKey) {
      return NextResponse.json(
        { error: "Supermemory API key is missing." },
        { status: 400 },
      );
    }
    enrichedMessages = await enrichWithKnowledge(limitedMessages, user.id, {
      extraKnowledge: matchedRule?.response,
      maxChunks: ragMaxChunks,
      chunkMaxChars: ragChunkMaxChars,
      maxContextChars: ragMaxContextChars,
    });
  }
  let text = "";
  const maxTokens =
    typeof maxOutputTokens === "number" && maxOutputTokens > 0
      ? maxOutputTokens
      : undefined;

  if (modelProvider === "groq") {
    const model = buildGroqModel(preferenceModel, preferenceApiKey);
    const response = await generateText({
      model,
      temperature,
      messages: enrichedMessages,
      maxTokens,
    });
    text = response.text;
  } else {
    text = await generateGoogleText({
      apiKey: preferenceApiKey,
      model: preferenceModel,
      temperature,
      messages: enrichedMessages,
      maxOutputTokens: maxTokens,
    });
  }

  return NextResponse.json({ text });
}
