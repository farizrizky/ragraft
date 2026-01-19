/*
  Warnings:

  - You are about to drop the column `chatTitle` on the `ChatPreference` table. All the data in the column will be lost.
  - You are about to drop the column `companyLogoUrl` on the `ChatPreference` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "AppSetting" ADD COLUMN     "routingKeyCiphertext" TEXT,
ADD COLUMN     "routingKeyIv" TEXT,
ADD COLUMN     "routingKeyTag" TEXT,
ADD COLUMN     "routingModel" TEXT,
ADD COLUMN     "routingProvider" TEXT;

-- AlterTable
ALTER TABLE "ChatPreference" DROP COLUMN "chatTitle",
DROP COLUMN "companyLogoUrl";
