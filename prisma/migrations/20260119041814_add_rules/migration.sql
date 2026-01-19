-- CreateTable
CREATE TABLE "ResponseRule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "phrase" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResponseRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ResponseRule_userId_enabled_priority_createdAt_idx" ON "ResponseRule"("userId", "enabled", "priority", "createdAt");

-- AddForeignKey
ALTER TABLE "ResponseRule" ADD CONSTRAINT "ResponseRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Sovereign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
