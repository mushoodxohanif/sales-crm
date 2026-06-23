import { z } from "zod";
import { createLeadsBulk } from "@/lib/integrations/api/create-leads-bulk";
import { ApiError, apiErrorResponse, apiSuccessResponse } from "@/lib/integrations/api/errors";
import { authenticateBearer } from "@/lib/integrations/authenticate-bearer";

const fieldValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.string()),
  z.null(),
]);

const bulkLeadSchema = z.object({
  fieldValues: z.record(z.string(), fieldValueSchema),
  idempotencyKey: z.string().min(1).optional(),
});

const bulkCreateBodySchema = z.object({
  campaignId: z.string().cuid(),
  leads: z.array(bulkLeadSchema).min(1).max(500),
});

export async function POST(request: Request) {
  try {
    const auth = await authenticateBearer(request, "leads:write");

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      throw new ApiError("bad_request", "Request body must be valid JSON.", 400);
    }

    const parsed = bulkCreateBodySchema.safeParse(body);

    if (!parsed.success) {
      throw new ApiError(
        "bad_request",
        parsed.error.issues[0]?.message ?? "Invalid request body.",
        400,
      );
    }

    const { campaignId, leads } = parsed.data;

    const result = await createLeadsBulk({
      campaignId,
      leads,
      userId: auth.userId,
    });

    return apiSuccessResponse(result);
  } catch (error) {
    if (error instanceof ApiError) {
      return apiErrorResponse(error);
    }

    if (error instanceof Error) {
      if (error.message === "Campaign not found.") {
        return apiErrorResponse(new ApiError("not_found", error.message, 404));
      }

      if (
        error.message === "Cannot add leads to an archived campaign." ||
        error.message === "Campaign has no pipeline stages."
      ) {
        return apiErrorResponse(new ApiError("bad_request", error.message, 400));
      }
    }

    console.error("POST /api/v1/leads/bulk error:", error);
    return apiErrorResponse(new ApiError("internal_error", "Failed to create leads.", 500));
  }
}
