import { createGroq, groq } from "@ai-sdk/groq";
import type { CoreMessage } from "ai";
import { generateText } from "ai";
import { generateGoogleText } from "@/lib/google-ai";

const minTemperature = 0;
const maxTemperature = 0.8;
const defaultModel = "llama-3.1-8b-instant";
const defaultProvider = "groq";

export type BriefPreference = {
  name: string;
  tone: string;
  description?: string | null;
  streamSpeed: string;
  openingLine: string;
  temperature: number;
  provider?: string | null;
  model?: string | null;
  apiKey?: string | null;
};

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

export function buildBriefPrompt(preference: BriefPreference) {
  const description = preference.description?.trim();
  return [
    "You are a chat assistant configuration brief.",
    `Assistant name: ${preference.name}.`,
    description ? `Assistant description: ${description}.` : "",
    `Language style: ${preference.tone}.`,
    `Stream speed: ${preference.streamSpeed}.`,
    `Opening line: ${preference.openingLine}.`,
    `Temperature: ${preference.temperature}.`,
    "Keep responses aligned with the configuration above.",
  ]
    .filter(Boolean)
    .join(" ");
}

export async function buildOpeningMessage(preference: BriefPreference) {
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
    { role: "user", content: `${userPrompt} Return only the line.` },
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

export function resolveBriefDefaults() {
  return {
    provider: defaultProvider,
    model: defaultModel,
  };
}
