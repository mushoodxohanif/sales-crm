-- CreateTable
CREATE TABLE "DailyTarget" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "leadStageId" TEXT NOT NULL,
    "targetCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadStageTransition" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "fromStageId" TEXT,
    "toStageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadStageTransition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DailyTarget_userId_leadStageId_key" ON "DailyTarget"("userId", "leadStageId");

-- CreateIndex
CREATE INDEX "LeadStageTransition_userId_toStageId_createdAt_idx" ON "LeadStageTransition"("userId", "toStageId", "createdAt");

-- AddForeignKey
ALTER TABLE "DailyTarget" ADD CONSTRAINT "DailyTarget_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyTarget" ADD CONSTRAINT "DailyTarget_leadStageId_fkey" FOREIGN KEY ("leadStageId") REFERENCES "LeadStage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadStageTransition" ADD CONSTRAINT "LeadStageTransition_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadStageTransition" ADD CONSTRAINT "LeadStageTransition_fromStageId_fkey" FOREIGN KEY ("fromStageId") REFERENCES "LeadStage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadStageTransition" ADD CONSTRAINT "LeadStageTransition_toStageId_fkey" FOREIGN KEY ("toStageId") REFERENCES "LeadStage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadStageTransition" ADD CONSTRAINT "LeadStageTransition_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
