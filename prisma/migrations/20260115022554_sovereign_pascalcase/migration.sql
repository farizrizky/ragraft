/*
  Warnings:

  - You are about to drop the `sovereign` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Account" DROP CONSTRAINT "Account_userId_fkey";

-- DropForeignKey
ALTER TABLE "AppSetting" DROP CONSTRAINT "AppSetting_userId_fkey";

-- DropForeignKey
ALTER TABLE "ChatKeyword" DROP CONSTRAINT "ChatKeyword_userId_fkey";

-- DropForeignKey
ALTER TABLE "ChatPreference" DROP CONSTRAINT "ChatPreference_userId_fkey";

-- DropForeignKey
ALTER TABLE "ChatQuestion" DROP CONSTRAINT "ChatQuestion_userId_fkey";

-- DropForeignKey
ALTER TABLE "ChatSession" DROP CONSTRAINT "ChatSession_userId_fkey";

-- DropForeignKey
ALTER TABLE "KnowledgeFile" DROP CONSTRAINT "KnowledgeFile_userId_fkey";

-- DropForeignKey
ALTER TABLE "KnowledgeText" DROP CONSTRAINT "KnowledgeText_userId_fkey";

-- DropForeignKey
ALTER TABLE "Session" DROP CONSTRAINT "Session_userId_fkey";

-- DropTable
DROP TABLE "sovereign";

-- CreateTable
CREATE TABLE "Sovereign" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "passwordHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sovereign_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Sovereign_email_key" ON "Sovereign"("email");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Sovereign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Sovereign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatPreference" ADD CONSTRAINT "ChatPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Sovereign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeText" ADD CONSTRAINT "KnowledgeText_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Sovereign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeFile" ADD CONSTRAINT "KnowledgeFile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Sovereign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppSetting" ADD CONSTRAINT "AppSetting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Sovereign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatSession" ADD CONSTRAINT "ChatSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Sovereign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatQuestion" ADD CONSTRAINT "ChatQuestion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Sovereign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatKeyword" ADD CONSTRAINT "ChatKeyword_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Sovereign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
