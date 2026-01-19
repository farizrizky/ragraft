import { createGroq, groq } from "@ai-sdk/groq";
import { generateText, type CoreMessage } from "ai";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getAiSetup, getSupermemoryKey } from "@/lib/settings";
import { generateGoogleTextWithUsage } from "@/lib/google-ai";
import {
  buildBriefPrompt,
  buildOpeningMessage,
  resolveBriefDefaults,
} from "@/lib/brief";
import { enrichWithKnowledge, getTextFromContent, routeNeedsRag } from "@/lib/rag";
import { limitMessagesForContext } from "@/lib/messages";
import { buildConstraintMessage } from "@/lib/constraints";
import { findMatchingRule, type ResponseRule } from "@/lib/rules";
import { logQuestion, trackSession } from "@/lib/analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const minTemperature = 0;
const maxTemperature = 0.8;
const defaultTemperature = 0.4;
const defaultModel = "openai/gpt-oss-120b";
const defaultProvider = "groq";

function isNumericCode(value: string) {
  return /^[0-9]+$/.test(value);
}

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


function buildGroqModel(model: string, apiKey: string | null) {
  if (apiKey) {
    return createGroq({ apiKey })(resolveModel(model));
  }
  return groq(resolveModel(model));
}


async function getPreferenceByCode(code: string) {
  return prisma.chatPreference.findUnique({
    where: { publicCode: code },
  });
}


export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const resolvedParams = await params;
  const code = resolvedParams.code?.trim() ?? "";
  if (!isNumericCode(code)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const preference = await getPreferenceByCode(code);
  if (!preference) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const name = preference.name?.trim() || "Assistant";
  const resolved = {
    name,
    tone: preference.tone,
    description: preference.description ?? "",
    streamSpeed: preference.streamSpeed,
    openingLine: preference.openingLine?.trim() || "",
    temperature: preference.temperature ?? defaultTemperature,
    ...resolveBriefDefaults(),
    apiKey: null as string | null,
  };

  try {
    const setup = await getAiSetup(preference.userId);
    resolved.provider = setup.provider;
    resolved.model = setup.model;
    resolved.apiKey = setup.apiKey;
  } catch {
    const fallback = resolveBriefDefaults();
    resolved.provider = fallback.provider;
    resolved.model = fallback.model;
    resolved.apiKey = null;
  }

  let openingLine = "";
  try {
    openingLine = await buildOpeningMessage(resolved);
  } catch {
    const fallback = resolved.openingLine.trim();
    openingLine = fallback ? fallback : `Hello! I'm ${name}.`;
  }

  const prompt = buildBriefPrompt({
    name: resolved.name,
    tone: resolved.tone,
    description: resolved.description,
    streamSpeed: resolved.streamSpeed,
    openingLine,
    temperature: resolved.temperature,
  });

  return NextResponse.json({
    preference: {
      name,
      description: preference.description ?? "",
      chatLogoUrl: preference.chatLogoUrl ?? "",
      headerColor: preference.headerColor ?? "#1f4bd8",
      headerTextColor: preference.headerTextColor ?? "#ffffff",
      streamSpeed: preference.streamSpeed,
    },
    openingMessage: openingLine,
    prompt,
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const resolvedParams = await params;
  const code = resolvedParams.code?.trim() ?? "";
  if (!isNumericCode(code)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const preference = await getPreferenceByCode(code);
  if (!preference) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const requestId = `${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 6)}`;
  const logStep = (step: string, detail?: string) => {
    if (!preference.developerMode) {
      return;
    }
    const suffix = detail ? ` | ${detail}` : "";
    console.log(`[PublicChat ${requestId}] ${step}${suffix}`);
  };

  logStep("request_received", `code=${code}`);

  const { messages } = (await request.json()) as {
    messages: CoreMessage[];
  };

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  try {
    await trackSession(preference.userId, ip);
    const lastUser = [...messages].reverse().find((item) => item.role === "user");
    const question = lastUser ? getTextFromContent(lastUser.content) : "";
    if (question) {
      await logQuestion(preference.userId, question);
    }
  } catch {
    // Ignore analytics failures.
  }

  const temperature =
    preference.temperature !== undefined
      ? clampTemperature(preference.temperature)
      : defaultTemperature;
  const maxOutputTokens =
    typeof preference.maxOutputTokens === "number" ? preference.maxOutputTokens : null;
  const historyMessageLimit =
    typeof preference.historyMessageLimit === "number"
      ? preference.historyMessageLimit
      : null;
  const ragMaxChunks =
    typeof preference.ragMaxChunks === "number" ? preference.ragMaxChunks : null;
  const ragChunkMaxChars =
    typeof preference.ragChunkMaxChars === "number"
      ? preference.ragChunkMaxChars
      : null;
  const ragMaxContextChars =
    typeof preference.ragMaxContextChars === "number"
      ? preference.ragMaxContextChars
      : null;

  logStep("preferences_loaded", `temperature=${temperature.toFixed(2)}`);
  if (historyMessageLimit && historyMessageLimit > 0) {
    logStep("history_limit", `limit=${historyMessageLimit}`);
  }

  let modelProvider = defaultProvider;
  let preferenceModel = defaultModel;
  let preferenceApiKey: string | null = null;

  try {
    const setup = await getAiSetup(preference.userId);
    modelProvider = resolveProvider(setup.provider);
    preferenceModel = resolveModel(setup.model);
    preferenceApiKey = setup.apiKey;
  } catch {
    modelProvider = defaultProvider;
    preferenceModel = defaultModel;
    preferenceApiKey = null;
  }

  logStep("answer_model_resolved", `${modelProvider}:${preferenceModel}`);

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

  logStep("answer_api_key_present");

  const lastUserMessage = [...messages]
    .reverse()
    .find((message) => message.role === "user");
  const lastUserText = lastUserMessage
    ? getTextFromContent(lastUserMessage.content)
    : "";

  if (lastUserText) {
    logStep("user_message", lastUserText.slice(0, 160));
  }

  let matchedRule: ResponseRule | null = null;
  let matchedPhrase: string | null = null;
  if (lastUserText) {
    const rules = await prisma.responseRule.findMany({
      where: { userId: preference.userId, enabled: true },
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
    });
    const match = findMatchingRule(rules, lastUserText);
    matchedRule = match?.rule ?? null;
    matchedPhrase = match?.matchedPhrase ?? null;
  }

  if (matchedRule) {
    logStep("rule_matched", matchedPhrase ?? matchedRule.phrase);
  } else {
    logStep("rule_matched", "none");
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
  const contextMessagesSent = limitedMessages.filter(
    (message) => message.role !== "system",
  ).length;
  logStep("context_messages_sent", `${contextMessagesSent}`);

  const routingDecision = await routeNeedsRag(messages, preference.userId);
  logStep(
    "routing_decision",
    `${routingDecision.needsRag ? "needs_rag" : "no_rag"} | ${routingDecision.reason}`,
  );
  let enrichedMessages = limitedMessages;
  if (routingDecision.needsRag) {
    const supermemoryKey = await getSupermemoryKey(preference.userId);
    if (!supermemoryKey) {
      return NextResponse.json(
        { error: "Supermemory API key is missing." },
        { status: 400 },
      );
    }
    enrichedMessages = await enrichWithKnowledge(limitedMessages, preference.userId, {
      extraKnowledge: matchedRule?.response,
      maxChunks: ragMaxChunks,
      chunkMaxChars: ragChunkMaxChars,
      maxContextChars: ragMaxContextChars,
    });
    logStep("supermemory_enriched");
  } else {
    logStep("supermemory_skipped");
  }
  let text = "";
  const maxTokens =
    typeof maxOutputTokens === "number" && maxOutputTokens > 0
      ? maxOutputTokens
      : undefined;

  if (modelProvider === "groq") {
    const model = buildGroqModel(preferenceModel, preferenceApiKey);
    logStep("generation_start", "provider=groq");
    const response = await generateText({
      model,
      temperature,
      messages: enrichedMessages,
      maxTokens,
    });
    text = response.text;
    const usage = (response as { usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number } }).usage;
    if (usage) {
      logStep(
        "token_usage",
        `prompt=${usage.promptTokens ?? 0} completion=${usage.completionTokens ?? 0} total=${usage.totalTokens ?? 0}`,
      );
    } else {
      logStep("token_usage", "unavailable");
    }
  } else {
    logStep("generation_start", "provider=google");
    const response = await generateGoogleTextWithUsage({
      apiKey: preferenceApiKey,
      model: preferenceModel,
      temperature,
      messages: enrichedMessages,
      maxOutputTokens: maxTokens,
    });
    text = response.text;
    if (response.usage) {
      logStep(
        "token_usage",
        `prompt=${response.usage.promptTokens} completion=${response.usage.completionTokens} total=${response.usage.totalTokens}`,
      );
    } else {
      logStep("token_usage", "unavailable");
    }
  }

  logStep("generation_complete", `length=${text.length}`);

  return NextResponse.json({ text });
}
