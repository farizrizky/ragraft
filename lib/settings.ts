import prisma from "@/lib/prisma";
import { decryptSecret } from "@/lib/crypto";

const defaultProvider = "groq";
const defaultModel = "llama-3.1-8b-instant";

export type AiSetup = {
  provider: string;
  model: string;
  apiKey: string | null;
};

export type RoutingSetup = {
  provider: string;
  model: string;
  apiKey: string | null;
  usesFallback: boolean;
};

export async function getAppSetting(userId: string) {
  return prisma.appSetting.findUnique({ where: { userId } });
}

export async function getAiSetup(userId: string): Promise<AiSetup> {
  const setting = await getAppSetting(userId);
  const provider = (setting?.provider ?? defaultProvider).trim() || defaultProvider;
  const model = (setting?.model ?? defaultModel).trim() || defaultModel;

  let apiKey: string | null = null;
  if (setting?.aiKeyCiphertext && setting.aiKeyIv && setting.aiKeyTag) {
    try {
      apiKey = decryptSecret({
        ciphertext: setting.aiKeyCiphertext,
        iv: setting.aiKeyIv,
        tag: setting.aiKeyTag,
      });
    } catch {
      apiKey = null;
    }
  }
  return { provider, model, apiKey };
}

export async function getRoutingSetup(userId: string): Promise<RoutingSetup> {
  const setting = await getAppSetting(userId);
  const fallback = await getAiSetup(userId);
  const provider = (setting?.routingProvider ?? "").trim();
  const model = (setting?.routingModel ?? "").trim();

  let apiKey: string | null = null;
  if (setting?.routingKeyCiphertext && setting.routingKeyIv && setting.routingKeyTag) {
    try {
      apiKey = decryptSecret({
        ciphertext: setting.routingKeyCiphertext,
        iv: setting.routingKeyIv,
        tag: setting.routingKeyTag,
      });
    } catch {
      apiKey = null;
    }
  }

  const usesFallback = !provider && !model && !apiKey;
  if (usesFallback) {
    return { ...fallback, usesFallback: true };
  }

  return {
    provider: provider || fallback.provider,
    model: model || fallback.model,
    apiKey,
    usesFallback: false,
  };
}

export async function getSupermemoryKey(userId: string) {
  const setting = await getAppSetting(userId);
  if (setting?.supermemoryKeyCiphertext && setting.supermemoryKeyIv && setting.supermemoryKeyTag) {
    try {
      return decryptSecret({
        ciphertext: setting.supermemoryKeyCiphertext,
        iv: setting.supermemoryKeyIv,
        tag: setting.supermemoryKeyTag,
      });
    } catch {
      return null;
    }
  }
  return null;
}
