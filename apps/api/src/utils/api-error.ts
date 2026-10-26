export type ErrorDetails = Record<string, unknown> | undefined;

/**
 * Application-level error carrying a stable machine readable code plus a safe
 * human readable message. Controllers/middleware never leak stack traces.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: ErrorDetails;

  constructor(status: number, code: string, message: string, details?: ErrorDetails) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static badRequest(message: string, details?: ErrorDetails): ApiError {
    return new ApiError(400, "VALIDATION_ERROR", message, details);
  }

  static unauthorized(message = "You need to sign in to continue."): ApiError {
    return new ApiError(401, "UNAUTHENTICATED", message);
  }

  static forbidden(message = "You do not have permission to perform this action."): ApiError {
    return new ApiError(403, "FORBIDDEN", message);
  }

  static notFound(message = "Resource not found."): ApiError {
    return new ApiError(404, "NOT_FOUND", message);
  }

  static conflict(code: string, message: string, details?: ErrorDetails): ApiError {
    return new ApiError(409, code, message, details);
  }

  static tooManyRequests(message = "Too many attempts. Please try again later."): ApiError {
    return new ApiError(429, "TOO_MANY_REQUESTS", message);
  }
}
