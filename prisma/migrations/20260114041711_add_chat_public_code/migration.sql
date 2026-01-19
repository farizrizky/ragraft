/*
  Warnings:

  - A unique constraint covering the columns `[publicCode]` on the table `ChatPreference` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "ChatPreference" ADD COLUMN     "description" TEXT,
ADD COLUMN     "publicCode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ChatPreference_publicCode_key" ON "ChatPreference"("publicCode");
