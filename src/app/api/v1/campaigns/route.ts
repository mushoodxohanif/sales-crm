import { CampaignStatus } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { ApiError, apiErrorResponse, apiSuccessResponse } from "@/lib/integrations/api/errors";
import { authenticateBearer } from "@/lib/integrations/authenticate-bearer";

export async function GET(request: Request) {
  try {
    await authenticateBearer(request, "campaigns:read");

    const campaigns = await db.campaign.findMany({
      where: { status: CampaignStatus.ACTIVE },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        status: true,
        campaignType: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    return apiSuccessResponse({ campaigns });
  } catch (error) {
    if (error instanceof ApiError) {
      return apiErrorResponse(error);
    }

    console.error("GET /api/v1/campaigns error:", error);
    return apiErrorResponse(new ApiError("internal_error", "Failed to list campaigns.", 500));
  }
}
