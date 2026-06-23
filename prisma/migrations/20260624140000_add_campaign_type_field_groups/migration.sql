-- CreateTable
CREATE TABLE "CampaignTypeFieldGroup" (
    "id" TEXT NOT NULL,
    "campaignTypeId" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "CampaignTypeFieldGroup_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "CampaignTypeField" ADD COLUMN "groupId" TEXT;

-- AddForeignKey
ALTER TABLE "CampaignTypeFieldGroup" ADD CONSTRAINT "CampaignTypeFieldGroup_campaignTypeId_fkey" FOREIGN KEY ("campaignTypeId") REFERENCES "CampaignType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignTypeField" ADD CONSTRAINT "CampaignTypeField_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "CampaignTypeFieldGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
