export type ApiErrorCode =
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "bad_request"
  | "rate_limited"
  | "internal_error";

export class ApiError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function apiErrorResponse(error: ApiError): Response {
  const headers =
    error.code === "rate_limited"
      ? {
          "Retry-After": String(
            Number.parseInt(error.message.match(/(\d+) seconds/)?.[1] ?? "60", 10),
          ),
        }
      : undefined;

  return Response.json(
    {
      error: error.code,
      message: error.message,
    },
    { status: error.status, headers },
  );
}

export function apiSuccessResponse<T>(data: T, status = 200): Response {
  return Response.json(data, { status });
}
