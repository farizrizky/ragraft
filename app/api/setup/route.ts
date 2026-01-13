import prisma from "@/lib/prisma";
import { encryptSecret } from "@/lib/crypto";
import { NextResponse } from "next/server";

const settingId = "default";

type SetupPayload = {
  provider?: string;
  model?: string;
  aiApiKey?: string;
  supermemoryApiKey?: string;
};

export async function GET() {
  const setting = await prisma.appSetting.findUnique({ where: { id: settingId } });

  if (!setting) {
    return NextResponse.json({
      setting: {
        provider: "groq",
        model: "llama-3.1-8b-instant",
      },
      hasAiKey: false,
      hasSupermemoryKey: false,
    });
  }

  const {
    aiKeyCiphertext,
    aiKeyIv,
    aiKeyTag,
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
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as SetupPayload;

  const provider = (body.provider ?? "groq").trim() || "groq";
  const model = (body.model ?? "llama-3.1-8b-instant").trim() || "llama-3.1-8b-instant";
  const aiApiKey = body.aiApiKey?.trim() ?? "";
  const supermemoryApiKey = body.supermemoryApiKey?.trim() ?? "";

  let encryptedAiKey: { ciphertext: string; iv: string; tag: string } | null = null;
  let encryptedSupermemoryKey: { ciphertext: string; iv: string; tag: string } | null =
    null;

  try {
    if (aiApiKey) {
      encryptedAiKey = encryptSecret(aiApiKey);
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
    where: { id: settingId },
    update: {
      provider,
      model,
      ...(encryptedAiKey
        ? {
            aiKeyCiphertext: encryptedAiKey.ciphertext,
            aiKeyIv: encryptedAiKey.iv,
            aiKeyTag: encryptedAiKey.tag,
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
      id: settingId,
      provider,
      model,
      aiKeyCiphertext: encryptedAiKey?.ciphertext ?? null,
      aiKeyIv: encryptedAiKey?.iv ?? null,
      aiKeyTag: encryptedAiKey?.tag ?? null,
      supermemoryKeyCiphertext: encryptedSupermemoryKey?.ciphertext ?? null,
      supermemoryKeyIv: encryptedSupermemoryKey?.iv ?? null,
      supermemoryKeyTag: encryptedSupermemoryKey?.tag ?? null,
    },
  });

  const {
    aiKeyCiphertext,
    aiKeyIv,
    aiKeyTag,
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
  });
}
