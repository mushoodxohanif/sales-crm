import { CampaignStatus, FieldType } from "../src/generated/prisma/client";
import { DEFAULT_STAGES } from "../src/lib/campaigns/default-stages";
import { db } from "../src/lib/db";
import { DEFAULT_ICP_PROFILE } from "../src/lib/icp/defaults";
import { LOSONO_OAUTH_CLIENT_ID } from "../src/lib/integrations/losono";

const LOSONO_INTEGRATION_CLIENT = {
  name: "Losono",
  clientId: LOSONO_OAUTH_CLIENT_ID,
  clientSecret: "",
  redirectUris: [],
  isPublic: true,
} as const;

const SEED_USER = {
  googleId: "seed-user-google-id",
  email: "seed@yourcompany.com",
  name: "Seed User",
};

const CAMPAIGN_TYPES = [
  {
    name: "LinkedIn Outreach",
    slug: "linkedin-outreach",
    description: "Leads sourced from LinkedIn connection and outreach campaigns.",
    fields: [
      {
        key: "full_name",
        label: "Full Name",
        fieldType: FieldType.TEXT,
        required: true,
        sortOrder: 0,
      },
      {
        key: "linkedin_url",
        label: "LinkedIn URL",
        fieldType: FieldType.URL,
        required: true,
        sortOrder: 1,
      },
      {
        key: "job_title",
        label: "Job Title",
        fieldType: FieldType.TEXT,
        required: false,
        sortOrder: 2,
      },
      {
        key: "company",
        label: "Company",
        fieldType: FieldType.TEXT,
        required: false,
        sortOrder: 3,
      },
      {
        key: "connection_note",
        label: "Connection Note",
        fieldType: FieldType.TEXTAREA,
        required: false,
        sortOrder: 4,
      },
    ],
    campaign: {
      name: "Q1 LinkedIn Outreach",
      leads: [
        {
          stageSlug: "new",
          values: {
            full_name: "Sarah Chen",
            linkedin_url: "https://www.linkedin.com/in/sarahchen",
            job_title: "VP of Sales",
            company: "Acme Corp",
            connection_note: "Met at SaaStr — interested in pipeline tooling.",
          },
        },
        {
          stageSlug: "contacted",
          values: {
            full_name: "Marcus Rivera",
            linkedin_url: "https://www.linkedin.com/in/marcusrivera",
            job_title: "Head of Growth",
            company: "Brightline",
            connection_note: "Sent intro message on 2026-01-15.",
          },
        },
        {
          stageSlug: "qualified",
          values: {
            full_name: "Priya Patel",
            linkedin_url: "https://www.linkedin.com/in/priyapatel",
            job_title: "Director of Revenue",
            company: "Northwind",
            connection_note: "Booked discovery call for next week.",
          },
        },
      ],
    },
  },
  {
    name: "Hunter.io Import",
    slug: "hunter-io-import",
    description: "Email leads imported from Hunter.io domain searches.",
    fields: [
      { key: "email", label: "Email", fieldType: FieldType.EMAIL, required: true, sortOrder: 0 },
      {
        key: "full_name",
        label: "Full Name",
        fieldType: FieldType.TEXT,
        required: true,
        sortOrder: 1,
      },
      {
        key: "company_domain",
        label: "Company Domain",
        fieldType: FieldType.URL,
        required: false,
        sortOrder: 2,
      },
      {
        key: "confidence_score",
        label: "Confidence Score",
        fieldType: FieldType.NUMBER,
        required: false,
        sortOrder: 3,
      },
    ],
    campaign: {
      name: "Hunter.io — SaaS Founders",
      leads: [
        {
          stageSlug: "new",
          values: {
            email: "alex.morgan@launchpad.io",
            full_name: "Alex Morgan",
            company_domain: "launchpad.io",
            confidence_score: 92,
          },
        },
        {
          stageSlug: "contacted",
          values: {
            email: "jordan.lee@stackflow.dev",
            full_name: "Jordan Lee",
            company_domain: "stackflow.dev",
            confidence_score: 87,
          },
        },
        {
          stageSlug: "won",
          values: {
            email: "taylor.nguyen@orbitcloud.com",
            full_name: "Taylor Nguyen",
            company_domain: "orbitcloud.com",
            confidence_score: 95,
          },
        },
      ],
    },
  },
] as const;

async function seedLosonoIntegrationClient() {
  const { clientId, clientSecret, name, redirectUris, isPublic } = LOSONO_INTEGRATION_CLIENT;

  await db.integrationClient.upsert({
    where: { clientId },
    update: {
      name,
      clientSecret,
      redirectUris,
      isPublic,
    },
    create: {
      clientId,
      name,
      clientSecret,
      redirectUris,
      isPublic,
    },
  });

  console.log(`Seeded integration client: ${name} (${clientId})`);
}

async function main() {
  console.log("Seeding database...");

  const user = await db.user.upsert({
    where: { email: SEED_USER.email },
    update: {},
    create: SEED_USER,
  });

  await db.workspaceIcpProfile.upsert({
    where: { id: DEFAULT_ICP_PROFILE.id },
    update: {
      productDescription: DEFAULT_ICP_PROFILE.productDescription,
      targetIndustries: DEFAULT_ICP_PROFILE.targetIndustries,
      idealEmployeeMin: DEFAULT_ICP_PROFILE.idealEmployeeMin,
      idealEmployeeMax: DEFAULT_ICP_PROFILE.idealEmployeeMax,
      scoringGuidelines: DEFAULT_ICP_PROFILE.scoringGuidelines,
      exclusionGuidelines: DEFAULT_ICP_PROFILE.exclusionGuidelines,
      scoreThresholds: DEFAULT_ICP_PROFILE.scoreThresholds,
    },
    create: DEFAULT_ICP_PROFILE,
  });

  for (const typeSeed of CAMPAIGN_TYPES) {
    const campaignType = await db.campaignType.upsert({
      where: { slug: typeSeed.slug },
      update: {
        name: typeSeed.name,
        description: typeSeed.description,
      },
      create: {
        name: typeSeed.name,
        slug: typeSeed.slug,
        description: typeSeed.description,
      },
    });

    const fieldMap = new Map<string, string>();

    for (const field of typeSeed.fields) {
      const savedField = await db.campaignTypeField.upsert({
        where: {
          campaignTypeId_key: {
            campaignTypeId: campaignType.id,
            key: field.key,
          },
        },
        update: {
          label: field.label,
          fieldType: field.fieldType,
          required: field.required,
          sortOrder: field.sortOrder,
        },
        create: {
          campaignTypeId: campaignType.id,
          key: field.key,
          label: field.label,
          fieldType: field.fieldType,
          required: field.required,
          sortOrder: field.sortOrder,
        },
      });

      fieldMap.set(field.key, savedField.id);
    }

    const existingCampaign = await db.campaign.findFirst({
      where: {
        name: typeSeed.campaign.name,
        campaignTypeId: campaignType.id,
      },
    });

    const campaign =
      existingCampaign ??
      (await db.campaign.create({
        data: {
          name: typeSeed.campaign.name,
          campaignTypeId: campaignType.id,
          status: CampaignStatus.ACTIVE,
          stages: {
            create: DEFAULT_STAGES.map((stage) => ({ ...stage })),
          },
        },
        include: { stages: true },
      }));

    const stages = await db.leadStage.findMany({
      where: { campaignId: campaign.id },
    });

    const stageBySlug = new Map(stages.map((stage) => [stage.slug, stage.id]));

    const existingLeadCount = await db.lead.count({
      where: { campaignId: campaign.id },
    });

    if (existingLeadCount > 0) {
      console.log(`Skipping leads for "${campaign.name}" — already seeded`);
      continue;
    }

    for (const leadSeed of typeSeed.campaign.leads) {
      const stageId = stageBySlug.get(leadSeed.stageSlug);

      if (!stageId) {
        throw new Error(`Missing stage "${leadSeed.stageSlug}" for campaign "${campaign.name}"`);
      }

      await db.lead.create({
        data: {
          campaignId: campaign.id,
          currentStageId: stageId,
          fieldValues: {
            create: Object.entries(leadSeed.values).map(([key, value]) => {
              const fieldId = fieldMap.get(key);

              if (!fieldId) {
                throw new Error(`Missing field "${key}" for campaign type "${typeSeed.name}"`);
              }

              return { fieldId, value };
            }),
          },
        },
      });
    }

    console.log(`Seeded campaign type: ${typeSeed.name}`);
  }

  await seedLosonoIntegrationClient();

  console.log(`Seed complete. Demo user: ${user.email}`);
}

main()
  .then(async () => {
    await db.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await db.$disconnect();
    process.exit(1);
  });
