import { groq } from "@ai-sdk/groq";
import { generateText, type CoreMessage } from "ai";
import { searchSupermemory } from "@/lib/supermemory";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const preferenceId = "default";
const minTemperature = 0;
const maxTemperature = 0.8;
const defaultTemperature = 0.4;

type ChatMessage = CoreMessage;

function clampTemperature(value: number) {
  return Math.min(Math.max(value, minTemperature), maxTemperature);
}

export async function POST(request: Request) {
  const { messages } = (await request.json()) as {
    messages: ChatMessage[];
  };

  let temperature = defaultTemperature;

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

  const { text } = await generateText({
    model: groq("llama-3.1-8b-instant"),
    temperature,
    messages: await enrichWithKnowledge(messages),
  });

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

    const chunks = await searchSupermemory(query);
    if (chunks.length === 0) {
      return [baseGuardMessage, ...messages];
    }

    const knowledgeBlock = chunks
      .slice(0, 6)
      .map((chunk, index) => `[#${index + 1}] ${chunk}`)
      .join("\n");

    const knowledgeMessage: CoreMessage = {
      role: "system",
      content: `${baseGuard}\n\nKnowledge base:\n${knowledgeBlock}`,
    };

    return [knowledgeMessage, ...messages];
  } catch {
    return [baseGuardMessage, ...messages];
  }
}
