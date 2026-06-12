-- CreateEnum
CREATE TYPE "IcpVerdict" AS ENUM ('STRONG', 'MIXED', 'NOT_ICP');

-- CreateEnum
CREATE TYPE "IcpDecision" AS ENUM ('TARGET', 'MAYBE', 'REJECT');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE');

-- CreateEnum
CREATE TYPE "TaskSource" AS ENUM ('MANUAL', 'AI_GENERATED');

-- CreateTable
CREATE TABLE "WorkspaceIcpProfile" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "productDescription" TEXT NOT NULL,
    "targetIndustries" JSONB NOT NULL,
    "idealEmployeeMin" INTEGER NOT NULL DEFAULT 5,
    "idealEmployeeMax" INTEGER NOT NULL DEFAULT 60,
    "scoringGuidelines" TEXT NOT NULL,
    "exclusionGuidelines" TEXT NOT NULL,
    "scoreThresholds" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceIcpProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadIcpEvaluation" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "verdict" "IcpVerdict" NOT NULL,
    "decision" "IcpDecision" NOT NULL,
    "industry" TEXT NOT NULL,
    "reasoning" TEXT[],
    "painPoints" TEXT[],
    "automationUseCases" TEXT[],
    "inputContext" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadIcpEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "leadId" TEXT,
    "campaignId" TEXT,
    "source" "TaskSource" NOT NULL DEFAULT 'MANUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LeadIcpEvaluation_leadId_createdAt_idx" ON "LeadIcpEvaluation"("leadId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Task_userId_status_idx" ON "Task"("userId", "status");

-- AddForeignKey
ALTER TABLE "LeadIcpEvaluation" ADD CONSTRAINT "LeadIcpEvaluation_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadIcpEvaluation" ADD CONSTRAINT "LeadIcpEvaluation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
