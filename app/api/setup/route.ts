import { getServerUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { encryptSecret } from "@/lib/crypto";
import { NextResponse } from "next/server";

type SetupPayload = {
  provider?: string;
  model?: string;
  aiApiKey?: string;
  supermemoryApiKey?: string;
  routingProvider?: string;
  routingModel?: string;
  routingApiKey?: string;
};

export async function GET() {
  const user = await getServerUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const setting = await prisma.appSetting.findUnique({
    where: { userId: user.id },
  });

  if (!setting) {
    return NextResponse.json({
    setting: {
      provider: "groq",
      model: "llama-3.1-8b-instant",
      routingProvider: null,
      routingModel: null,
    },
    hasAiKey: false,
    hasSupermemoryKey: false,
    hasRoutingKey: false,
  });
}

  const {
    aiKeyCiphertext,
    aiKeyIv,
    aiKeyTag,
    routingKeyCiphertext,
    routingKeyIv,
    routingKeyTag,
    supermemoryKeyCiphertext,
    supermemoryKeyIv,
    supermemoryKeyTag,
    ...safeSetting
  } = setting;

  return NextResponse.json({
    setting: safeSetting,
    hasAiKey: Boolean(aiKeyCiphertext && aiKeyIv && aiKeyTag),
    hasSupermemoryKey: Boolean(
      supermemoryKeyCiphertext && supermemoryKeyIv && supermemoryKeyTag,
    ),
    hasRoutingKey: Boolean(routingKeyCiphertext && routingKeyIv && routingKeyTag),
  });
}

export async function POST(request: Request) {
  const user = await getServerUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as SetupPayload;

  const provider = (body.provider ?? "groq").trim() || "groq";
  const model = (body.model ?? "llama-3.1-8b-instant").trim() || "llama-3.1-8b-instant";
  const aiApiKey = body.aiApiKey?.trim() ?? "";
  const supermemoryApiKey = body.supermemoryApiKey?.trim() ?? "";
  const routingProvider = (body.routingProvider ?? "").trim() || null;
  const routingModel = (body.routingModel ?? "").trim() || null;
  const routingApiKey = body.routingApiKey?.trim() ?? "";

  let encryptedAiKey: { ciphertext: string; iv: string; tag: string } | null = null;
  let encryptedRoutingKey: { ciphertext: string; iv: string; tag: string } | null =
    null;
  let encryptedSupermemoryKey: { ciphertext: string; iv: string; tag: string } | null =
    null;

  try {
    if (aiApiKey) {
      encryptedAiKey = encryptSecret(aiApiKey);
    }
    if (routingApiKey) {
      encryptedRoutingKey = encryptSecret(routingApiKey);
    }
    if (supermemoryApiKey) {
      encryptedSupermemoryKey = encryptSecret(supermemoryApiKey);
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to encrypt API key.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const setting = await prisma.appSetting.upsert({
    where: { userId: user.id },
    update: {
      provider,
      model,
      routingProvider,
      routingModel,
      ...(encryptedAiKey
        ? {
            aiKeyCiphertext: encryptedAiKey.ciphertext,
            aiKeyIv: encryptedAiKey.iv,
            aiKeyTag: encryptedAiKey.tag,
          }
        : {}),
      ...(routingApiKey
        ? {
            routingKeyCiphertext: encryptedRoutingKey?.ciphertext ?? null,
            routingKeyIv: encryptedRoutingKey?.iv ?? null,
            routingKeyTag: encryptedRoutingKey?.tag ?? null,
          }
        : {}),
      ...(encryptedSupermemoryKey
        ? {
            supermemoryKeyCiphertext: encryptedSupermemoryKey.ciphertext,
            supermemoryKeyIv: encryptedSupermemoryKey.iv,
            supermemoryKeyTag: encryptedSupermemoryKey.tag,
          }
        : {}),
    },
    create: {
      userId: user.id,
      provider,
      model,
      routingProvider,
      routingModel,
      aiKeyCiphertext: encryptedAiKey?.ciphertext ?? null,
      aiKeyIv: encryptedAiKey?.iv ?? null,
      aiKeyTag: encryptedAiKey?.tag ?? null,
      routingKeyCiphertext: encryptedRoutingKey?.ciphertext ?? null,
      routingKeyIv: encryptedRoutingKey?.iv ?? null,
      routingKeyTag: encryptedRoutingKey?.tag ?? null,
      supermemoryKeyCiphertext: encryptedSupermemoryKey?.ciphertext ?? null,
      supermemoryKeyIv: encryptedSupermemoryKey?.iv ?? null,
      supermemoryKeyTag: encryptedSupermemoryKey?.tag ?? null,
    },
  });

  const {
    aiKeyCiphertext,
    aiKeyIv,
    aiKeyTag,
    routingKeyCiphertext,
    routingKeyIv,
    routingKeyTag,
    supermemoryKeyCiphertext,
    supermemoryKeyIv,
    supermemoryKeyTag,
    ...safeSetting
  } = setting;

  return NextResponse.json({
    setting: safeSetting,
    hasAiKey: Boolean(aiKeyCiphertext && aiKeyIv && aiKeyTag),
    hasSupermemoryKey: Boolean(
      supermemoryKeyCiphertext && supermemoryKeyIv && supermemoryKeyTag,
    ),
    hasRoutingKey: Boolean(routingKeyCiphertext && routingKeyIv && routingKeyTag),
  });
}
