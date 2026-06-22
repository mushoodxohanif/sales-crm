-- CreateEnum
CREATE TYPE "LeadVersionChangeType" AS ENUM ('CREATED', 'UPDATED', 'STAGE_MOVED', 'REVERTED');

-- CreateTable
CREATE TABLE "LeadVersion" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "userId" TEXT,
    "changeType" "LeadVersionChangeType" NOT NULL,
    "stageId" TEXT NOT NULL,
    "fieldValues" JSONB NOT NULL,
    "summary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LeadVersion_leadId_createdAt_idx" ON "LeadVersion"("leadId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "LeadVersion" ADD CONSTRAINT "LeadVersion_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadVersion" ADD CONSTRAINT "LeadVersion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadVersion" ADD CONSTRAINT "LeadVersion_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "LeadStage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
