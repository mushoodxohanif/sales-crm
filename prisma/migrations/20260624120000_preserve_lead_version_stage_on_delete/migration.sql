-- Preserve lead version history when pipeline stages are removed.
ALTER TABLE "LeadVersion" ADD COLUMN "stageName" TEXT;
ALTER TABLE "LeadVersion" ADD COLUMN "stageColor" TEXT;

UPDATE "LeadVersion" AS lv
SET
  "stageName" = ls."name",
  "stageColor" = ls."color"
FROM "LeadStage" AS ls
WHERE lv."stageId" = ls."id";

ALTER TABLE "LeadVersion" ALTER COLUMN "stageName" SET NOT NULL;

ALTER TABLE "LeadVersion" DROP CONSTRAINT "LeadVersion_stageId_fkey";
ALTER TABLE "LeadVersion" ALTER COLUMN "stageId" DROP NOT NULL;
ALTER TABLE "LeadVersion"
  ADD CONSTRAINT "LeadVersion_stageId_fkey"
  FOREIGN KEY ("stageId") REFERENCES "LeadStage"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LeadStageTransition" DROP CONSTRAINT "LeadStageTransition_toStageId_fkey";
ALTER TABLE "LeadStageTransition" ALTER COLUMN "toStageId" DROP NOT NULL;
ALTER TABLE "LeadStageTransition"
  ADD CONSTRAINT "LeadStageTransition_toStageId_fkey"
  FOREIGN KEY ("toStageId") REFERENCES "LeadStage"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
