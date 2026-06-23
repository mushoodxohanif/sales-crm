import { db } from "@/lib/db";
import { ApiError, apiErrorResponse, apiSuccessResponse } from "@/lib/integrations/api/errors";
import { authenticateBearer } from "@/lib/integrations/authenticate-bearer";
import { parseFieldOptions } from "@/lib/leads/field-values";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    await authenticateBearer(request, "campaigns:read");

    const { id } = await context.params;

    const campaign = await db.campaign.findUnique({
      where: { id },
      select: {
        id: true,
        campaignType: {
          select: {
            fields: {
              orderBy: { sortOrder: "asc" },
              select: {
                key: true,
                label: true,
                fieldType: true,
                required: true,
                isUnique: true,
                options: true,
              },
            },
          },
        },
      },
    });

    if (!campaign) {
      throw new ApiError("not_found", "Campaign not found.", 404);
    }

    const fields = campaign.campaignType.fields.map((field) => ({
      key: field.key,
      label: field.label,
      type: field.fieldType,
      required: field.required,
      isUnique: field.isUnique,
      options: parseFieldOptions(field.options),
    }));

    return apiSuccessResponse({ fields });
  } catch (error) {
    if (error instanceof ApiError) {
      return apiErrorResponse(error);
    }

    console.error("GET /api/v1/campaigns/:id/fields error:", error);
    return apiErrorResponse(new ApiError("internal_error", "Failed to list campaign fields.", 500));
  }
}
