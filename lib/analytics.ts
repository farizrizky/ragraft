import crypto from "crypto";
import prisma from "@/lib/prisma";

const SESSION_WINDOW_MINUTES = 30;

const stopwords = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "you",
  "your",
  "what",
  "which",
  "from",
  "how",
  "are",
  "can",
  "will",
  "was",
  "were",
  "have",
  "has",
  "had",
  "not",
  "but",
  "about",
  "jadi",
  "yang",
  "dan",
  "atau",
  "juga",
  "karena",
  "sebab",
  "maka",
  "agar",
  "supaya",
  "dengan",
  "untuk",
  "dari",
  "di",
  "ke",
  "pada",
  "oleh",
  "sebagai",
  "seperti",
  "untuk",
  "dengan",
  "ini",
  "itu",
  "saya",
  "aku",
  "kami",
  "kita",
  "kamu",
  "anda",
  "dia",
  "mereka",
  "apa",
  "mengapa",
  "kenapa",
  "bagaimana",
  "kapan",
  "dimana",
  "mana",
  "siapa",
  "kamu",
  "anda",
  "bagaimana",
  "apa",
  "dari",
  "dalam",
  "oleh",
  "bisa",
  "sudah",
  "belum",
]);

function getSalt() {
  return (
    process.env.ANALYTICS_IP_SALT ||
    process.env.APP_ENCRYPTION_KEY ||
    "ragnara-analytics"
  );
}

export function hashIp(ip: string) {
  return crypto
    .createHash("sha256")
    .update(`${getSalt()}::${ip}`)
    .digest("hex");
}

export function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractKeywords(text: string) {
  return normalizeText(text)
    .split(" ")
    .map((word) => word.trim())
    .filter((word) => word.length >= 3 && !stopwords.has(word));
}

export async function trackSession(userId: string, ip: string) {
  const ipHash = hashIp(ip);
  const now = new Date();
  const cutoff = new Date(now.getTime() - SESSION_WINDOW_MINUTES * 60 * 1000);

  const latest = await prisma.chatSession.findFirst({
    where: { userId, ipHash },
    orderBy: { lastSeenAt: "desc" },
  });

  if (latest && latest.lastSeenAt >= cutoff) {
    await prisma.chatSession.update({
      where: { id: latest.id },
      data: { lastSeenAt: now },
    });
    return latest.id;
  }

  const session = await prisma.chatSession.create({
    data: {
      userId,
      ipHash,
      startedAt: now,
      lastSeenAt: now,
    },
  });
  return session.id;
}

export async function logQuestion(userId: string, question: string) {
  const normalized = normalizeText(question);
  if (!normalized) {
    return;
  }
  await prisma.chatQuestion.upsert({
    where: { userId_text: { userId, text: normalized } },
    update: {
      count: { increment: 1 },
      lastAskedAt: new Date(),
    },
    create: {
      userId,
      text: normalized,
      count: 1,
      lastAskedAt: new Date(),
    },
  });

  const keywords = extractKeywords(normalized);
  if (keywords.length === 0) {
    return;
  }

  await prisma.$transaction(
    keywords.map((keyword) =>
      prisma.chatKeyword.upsert({
        where: { userId_keyword: { userId, keyword } },
        update: {
          count: { increment: 1 },
          lastUsedAt: new Date(),
        },
        create: {
          userId,
          keyword,
          count: 1,
          lastUsedAt: new Date(),
        },
      }),
    ),
  );
}
