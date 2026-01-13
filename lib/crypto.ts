import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const expectedKeyLength = 32;

function getEncryptionKey() {
  const rawKey = process.env.APP_ENCRYPTION_KEY ?? "";
  if (!rawKey) {
    throw new Error("APP_ENCRYPTION_KEY is not set.");
  }

  const key = Buffer.from(rawKey, "base64");
  if (key.length !== expectedKeyLength) {
    throw new Error("APP_ENCRYPTION_KEY must be 32 bytes (base64-encoded).");
  }

  return key;
}

export function encryptSecret(secret: string) {
  const key = getEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    ciphertext: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
  };
}

export function decryptSecret(payload: {
  ciphertext: string;
  iv: string;
  tag: string;
}) {
  const key = getEncryptionKey();
  const iv = Buffer.from(payload.iv, "base64");
  const tag = Buffer.from(payload.tag, "base64");
  const encrypted = Buffer.from(payload.ciphertext, "base64");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}
