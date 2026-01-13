-- AlterTable
ALTER TABLE "ChatPreference" ADD COLUMN     "apiKeyCiphertext" TEXT,
ADD COLUMN     "apiKeyIv" TEXT,
ADD COLUMN     "apiKeyTag" TEXT,
ADD COLUMN     "model" TEXT NOT NULL DEFAULT 'llama-3.1-8b-instant',
ADD COLUMN     "provider" TEXT NOT NULL DEFAULT 'groq';

-- CreateTable
CREATE TABLE "AppSetting" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'groq',
    "model" TEXT NOT NULL DEFAULT 'llama-3.1-8b-instant',
    "aiKeyCiphertext" TEXT,
    "aiKeyIv" TEXT,
    "aiKeyTag" TEXT,
    "supermemoryKeyCiphertext" TEXT,
    "supermemoryKeyIv" TEXT,
    "supermemoryKeyTag" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("id")
);
