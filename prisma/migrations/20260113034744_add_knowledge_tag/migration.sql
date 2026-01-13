-- DropIndex
DROP INDEX "KnowledgeFile_containerTag_key";

-- DropIndex
DROP INDEX "KnowledgeText_containerTag_key";

-- AlterTable
ALTER TABLE "KnowledgeFile" ADD COLUMN     "tag" TEXT;

-- AlterTable
ALTER TABLE "KnowledgeText" ADD COLUMN     "tag" TEXT;
