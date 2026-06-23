import { z } from "zod";
import { createLeadFromApi } from "@/lib/integrations/api/create-leads-bulk";
import { ApiError, apiErrorResponse, apiSuccessResponse } from "@/lib/integrations/api/errors";
import { authenticateBearer } from "@/lib/integrations/authenticate-bearer";

const fieldValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.string()),
  z.null(),
]);

const createLeadBodySchema = z.object({
  campaignId: z.string().cuid(),
  fieldValues: z.record(z.string(), fieldValueSchema),
  idempotencyKey: z.string().min(1).optional(),
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

    const parsed = createLeadBodySchema.safeParse(body);

    if (!parsed.success) {
      throw new ApiError(
        "bad_request",
        parsed.error.issues[0]?.message ?? "Invalid request body.",
        400,
      );
    }

    const { campaignId, fieldValues, idempotencyKey } = parsed.data;

    const result = await createLeadFromApi({
      campaignId,
      fieldValues,
      idempotencyKey,
      userId: auth.userId,
    });

    if (result.status === "existing") {
      return apiSuccessResponse({ id: result.id, created: false });
    }

    if (result.status === "error") {
      throw new ApiError(
        result.statusCode === 404 ? "not_found" : "bad_request",
        result.error,
        result.statusCode,
      );
    }

    return apiSuccessResponse({ id: result.id, created: true }, 201);
  } catch (error) {
    if (error instanceof ApiError) {
      return apiErrorResponse(error);
    }

    console.error("POST /api/v1/leads error:", error);
    return apiErrorResponse(new ApiError("internal_error", "Failed to create lead.", 500));
  }
}
