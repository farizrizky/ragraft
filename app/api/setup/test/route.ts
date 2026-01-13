import { createGroq } from "@ai-sdk/groq";
import { generateText } from "ai";
import { NextResponse } from "next/server";
import { getAiSetup, getSupermemoryKey } from "@/lib/settings";
import { generateGoogleText } from "@/lib/google-ai";

const defaultSupermemoryTag =
  process.env.SUPERMEMORY_CONTAINER_TAG?.trim() || "ragraft_default";

type TestResult = {
  ok: boolean;
  message: string;
};

export async function POST() {
  const logs: string[] = [];
  const results: { ai: TestResult; supermemory: TestResult } = {
    ai: { ok: false, message: "Not tested." },
    supermemory: { ok: false, message: "Not tested." },
  };

  logs.push("Starting connection tests...");

  try {
    const aiSetup = await getAiSetup();
    const provider = aiSetup.provider.toLowerCase();
    logs.push(`AI provider: ${aiSetup.provider}`);
    logs.push(`AI model: ${aiSetup.model}`);

    if (!aiSetup.apiKey) {
      results.ai = { ok: false, message: "API key is missing." };
      logs.push("AI: missing API key.");
    } else if (provider === "groq") {
      const model = createGroq({ apiKey: aiSetup.apiKey })(aiSetup.model);
      await generateText({
        model,
        temperature: 0,
        messages: [{ role: "user", content: "Ping" }],
      });
      results.ai = { ok: true, message: "Connected." };
      logs.push("AI: connection OK.");
    } else if (provider === "google") {
      await generateGoogleText({
        apiKey: aiSetup.apiKey,
        model: aiSetup.model,
        temperature: 0,
        messages: [{ role: "user", content: "Ping" }],
      });
      results.ai = { ok: true, message: "Connected." };
      logs.push("AI: connection OK.");
    } else {
      results.ai = { ok: false, message: "Provider not supported yet." };
      logs.push("AI: unsupported provider.");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI test failed.";
    results.ai = { ok: false, message };
    logs.push(`AI: ${message}`);
  }

  try {
    const supermemoryKey = await getSupermemoryKey();
    if (!supermemoryKey) {
      results.supermemory = { ok: false, message: "API key is missing." };
      logs.push("Supermemory: missing API key.");
    } else {
      const response = await fetch("https://api.supermemory.ai/v3/search", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${supermemoryKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          q: "health check",
          containerTags: [defaultSupermemoryTag],
          chunkThreshold: 0,
          documentThreshold: 0,
          onlyMatchingChunks: true,
          includeFullDocs: false,
          includeSummary: false,
          limit: 1,
          rerank: false,
          rewriteQuery: false,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        results.supermemory = {
          ok: false,
          message: errorText || "Supermemory test failed.",
        };
        logs.push(`Supermemory: ${errorText || "Request failed."}`);
      } else {
        results.supermemory = { ok: true, message: "Connected." };
        logs.push("Supermemory: connection OK.");
      }
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Supermemory test failed.";
    results.supermemory = { ok: false, message };
    logs.push(`Supermemory: ${message}`);
  }

  logs.push("Test completed.");

  return NextResponse.json({ results, logs });
}
