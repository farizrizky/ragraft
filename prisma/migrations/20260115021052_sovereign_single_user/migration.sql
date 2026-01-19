/*
  Warnings:

  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "ChatPreference" ADD COLUMN     "policyPrompt" TEXT;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "role";

-- DropEnum
DROP TYPE "Role";

-- RenameTable
ALTER TABLE "User" RENAME TO "sovereign";

-- RenameConstraint
ALTER TABLE "sovereign" RENAME CONSTRAINT "User_pkey" TO "sovereign_pkey";

-- RenameIndex
ALTER INDEX "User_email_key" RENAME TO "sovereign_email_key";
