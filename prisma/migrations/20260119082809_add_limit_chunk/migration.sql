-- AlterTable
ALTER TABLE "ChatPreference" ADD COLUMN     "ragChunkMaxChars" INTEGER,
ADD COLUMN     "ragMaxChunks" INTEGER,
ADD COLUMN     "ragMaxContextChars" INTEGER;
