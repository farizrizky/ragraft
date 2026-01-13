import type { CoreMessage } from "ai";

type GoogleGenerateInput = {
  apiKey: string;
  model: string;
  messages: CoreMessage[];
  temperature?: number;
};

type GoogleCandidate = {
  content?: {
    parts?: Array<{ text?: string }>;
  };
};

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

function buildGooglePayload(messages: CoreMessage[], temperature?: number) {
  const systemMessages = messages.filter((message) => message.role === "system");
  const systemText = systemMessages
    .map((message) => getTextFromContent(message.content))
    .filter(Boolean)
    .join("\n\n");

  const contents = messages
    .filter((message) => message.role !== "system")
    .map((message) => {
      const text = getTextFromContent(message.content);
      if (!text) {
        return null;
      }
      return {
        role: message.role === "assistant" ? "model" : "user",
        parts: [{ text }],
      };
    })
    .filter(Boolean);

  return {
    systemInstruction: systemText ? { parts: [{ text: systemText }] } : undefined,
    contents,
    generationConfig: {
      temperature: typeof temperature === "number" ? temperature : undefined,
    },
  };
}

export async function generateGoogleText(input: GoogleGenerateInput) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    input.model,
  )}:generateContent?key=${encodeURIComponent(input.apiKey)}`;

  const payload = buildGooglePayload(input.messages, input.temperature);

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Failed to generate Google AI response.");
  }

  const data = (await response.json()) as {
    candidates?: GoogleCandidate[];
  };

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) {
    throw new Error("Google AI response was empty.");
  }

  return text;
}
