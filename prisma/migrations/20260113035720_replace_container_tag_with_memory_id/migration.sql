/*
  Warnings:

  - You are about to drop the column `containerTag` on the `KnowledgeFile` table. All the data in the column will be lost.
  - You are about to drop the column `containerTag` on the `KnowledgeText` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "KnowledgeFile" DROP COLUMN "containerTag",
ADD COLUMN     "memoryId" TEXT;

-- AlterTable
ALTER TABLE "KnowledgeText" DROP COLUMN "containerTag",
ADD COLUMN     "memoryId" TEXT;
