import prisma from "@/lib/prisma";
import { searchSupermemory } from "@/lib/supermemory";
import { getRoutingSetup } from "@/lib/settings";
import { generateText, type CoreMessage } from "ai";
import { createGroq } from "@ai-sdk/groq";
import { generateGoogleText } from "@/lib/google-ai";

function normalizeTag(value: string) {
  return value.trim().toLowerCase();
}

function truncateBySentence(value: string, maxChars: number) {
  const trimmed = value.trim();
  if (trimmed.length <= maxChars) {
    return trimmed;
  }
  const slice = trimmed.slice(0, maxChars);
  const lastSentenceEnd = Math.max(
    slice.lastIndexOf("."),
    slice.lastIndexOf("?"),
    slice.lastIndexOf("!"),
  );
  if (lastSentenceEnd > Math.floor(maxChars * 0.5)) {
    return slice.slice(0, lastSentenceEnd + 1).trim();
  }
  return `${slice.trim()}...`;
}

export function getTextFromContent(content: CoreMessage["content"]) {
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

type RoutingDecision = {
  needsRag: boolean;
  reason: string;
  queryHint: string;
};

const routingPrompt = `You are a router for RAG. Your only job is to decide whether we should search Supermemory.
Return only a single character:
- "1" if the question needs RAG (internal knowledge or documents).
- "0" if it does not (greetings, chit-chat, or general instructions).
Do not include any other text.`;

function parseRoutingDecision(raw: string): RoutingDecision | null {
  const trimmed = raw.trim();
  if (trimmed === "1" || trimmed === "0") {
    return {
      needsRag: trimmed === "1",
      reason: "binary_response",
      queryHint: "",
    };
  }

  const digitMatch = trimmed.match(/\b([01])\b/);
  if (digitMatch) {
    return {
      needsRag: digitMatch[1] === "1",
      reason: "binary_response",
      queryHint: "",
    };
  }

  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return null;
  }
  try {
    const parsed = JSON.parse(jsonMatch[0]) as {
      needs_rag?: boolean;
      reason?: string;
      query_hint?: string;
    };
    if (typeof parsed.needs_rag !== "boolean") {
      return null;
    }
    return {
      needsRag: parsed.needs_rag,
      reason: typeof parsed.reason === "string" ? parsed.reason : "",
      queryHint: typeof parsed.query_hint === "string" ? parsed.query_hint : "",
    };
  } catch {
    return null;
  }
}

async function classifyNeedsRag(
  message: string,
  userId: string,
): Promise<RoutingDecision> {
  const routingSetup = await getRoutingSetup(userId);
  if (!routingSetup.apiKey) {
    return { needsRag: false, reason: "routing_api_key_missing", queryHint: "" };
  }

  const messages: CoreMessage[] = [
    { role: "system", content: routingPrompt },
    { role: "user", content: `User message:\n${message}` },
  ];

  if (routingSetup.provider === "google") {
    const text = await generateGoogleText({
      apiKey: routingSetup.apiKey,
      model: routingSetup.model,
      temperature: 0,
      messages,
    });
    return (
      parseRoutingDecision(text) ?? {
        needsRag: false,
        reason: "routing_parse_failed",
        queryHint: "",
      }
    );
  }

  const model = createGroq({ apiKey: routingSetup.apiKey })(routingSetup.model);
  const response = await generateText({
    model,
    temperature: 0,
    messages,
  });
  return (
    parseRoutingDecision(response.text) ?? {
      needsRag: false,
      reason: "routing_parse_failed",
      queryHint: "",
    }
  );
}

export async function routeNeedsRag(
  messages: CoreMessage[],
  userId: string,
): Promise<RoutingDecision> {
  const lastUserMessage = [...messages]
    .reverse()
    .find((message) => message.role === "user");
  if (!lastUserMessage) {
    return { needsRag: false, reason: "no_user_message", queryHint: "" };
  }
  const query = getTextFromContent(lastUserMessage.content);
  if (!query) {
    return { needsRag: false, reason: "empty_query", queryHint: "" };
  }
  try {
    return await classifyNeedsRag(query, userId);
  } catch {
    return { needsRag: false, reason: "routing_failed", queryHint: "" };
  }
}

export async function enrichWithKnowledge(
  messages: CoreMessage[],
  userId: string,
  options?: {
    extraKnowledge?: string;
    maxChunks?: number | null;
    chunkMaxChars?: number | null;
    maxContextChars?: number | null;
  },
): Promise<CoreMessage[]> {
  const lastUserMessage = [...messages]
    .reverse()
    .find((message) => message.role === "user");
  if (!lastUserMessage) {
    return messages;
  }

  const extraKnowledge = options?.extraKnowledge?.trim();
  const baseGuard = extraKnowledge
    ? "You must answer using only the knowledge base provided. If the answer is not present, you may answer using the rule response included. If neither is present, say you don't know."
    : "You must answer using only the knowledge base provided. If the answer is not present, say you don't know.";
  const baseGuardMessage: CoreMessage = { role: "system", content: baseGuard };
  const buildKnowledgeMessage = (sources: string[]) => ({
    role: "user" as const,
    content: `Use the knowledge base below to answer the user question.\n\nKnowledge base:\n${sources.join("\n")}`,
  });
  const fallbackWithExtraKnowledge = () => {
    if (!extraKnowledge) {
      return [baseGuardMessage, ...messages];
    }
    const knowledgeMessage = buildKnowledgeMessage([`[#0] ${extraKnowledge}`]);
    return [baseGuardMessage, knowledgeMessage, ...messages];
  };

  try {
    const query = getTextFromContent(lastUserMessage.content);
    if (!query) {
      return fallbackWithExtraKnowledge();
    }

    const queryLower = query.toLowerCase();
    const [fileItems, textItems] = await Promise.all([
      prisma.knowledgeFile.findMany({
        where: { userId },
        select: { tag: true },
      }),
      prisma.knowledgeText.findMany({
        where: { userId },
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
      return fallbackWithExtraKnowledge();
    }

    const chunks = await searchSupermemory(query, { containerTags, userId });
    if (chunks.length === 0) {
      return fallbackWithExtraKnowledge();
    }

    const maxChunks =
      typeof options?.maxChunks === "number" && options.maxChunks > 0
        ? options.maxChunks
        : 6;
    const chunkMaxChars =
      typeof options?.chunkMaxChars === "number" && options.chunkMaxChars > 0
        ? options.chunkMaxChars
        : null;
    const maxContextChars =
      typeof options?.maxContextChars === "number" && options.maxContextChars > 0
        ? options.maxContextChars
        : null;
    const cleanedChunks = chunks.slice(0, maxChunks).map((chunk) => {
      if (!chunkMaxChars) {
        return chunk;
      }
      return chunk.length > chunkMaxChars
        ? truncateBySentence(chunk, chunkMaxChars)
        : chunk;
    });
    const knowledgeSources = extraKnowledge
      ? [`[#0] ${extraKnowledge}`, ...cleanedChunks.map((chunk, index) => `[#${index + 1}] ${chunk}`)]
      : cleanedChunks.map((chunk, index) => `[#${index + 1}] ${chunk}`);
    const limitedSources = maxContextChars
      ? (() => {
          const collected: string[] = [];
          let total = 0;
          for (const source of knowledgeSources) {
            const nextTotal = total + source.length + 1;
            if (nextTotal > maxContextChars && collected.length > 0) {
              break;
            }
            collected.push(source);
            total = nextTotal;
          }
          return collected;
        })()
      : knowledgeSources;
    const knowledgeMessage = buildKnowledgeMessage(limitedSources);

    return [baseGuardMessage, knowledgeMessage, ...messages];
  } catch {
    return fallbackWithExtraKnowledge();
  }
}
