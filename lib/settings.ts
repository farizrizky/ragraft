import prisma from "@/lib/prisma";
import { decryptSecret } from "@/lib/crypto";

const settingId = "default";
const defaultProvider = "groq";
const defaultModel = "llama-3.1-8b-instant";

export type AiSetup = {
  provider: string;
  model: string;
  apiKey: string | null;
};

export async function getAppSetting() {
  return prisma.appSetting.findUnique({ where: { id: settingId } });
}

export async function getAiSetup(): Promise<AiSetup> {
  const setting = await getAppSetting();
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
  const providerKey = provider.toLowerCase();
  if (!apiKey && providerKey === "groq") {
    apiKey = process.env.GROQ_API_KEY ?? null;
  }
  if (!apiKey && providerKey === "google") {
    apiKey = process.env.GOOGLE_API_KEY ?? null;
  }

  return { provider, model, apiKey };
}

export async function getSupermemoryKey() {
  const setting = await getAppSetting();
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
  return process.env.SUPERMEMORY_API_KEY ?? null;
}
