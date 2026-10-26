import type { ErrorRequestHandler, RequestHandler } from "express";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { env } from "../config/env.js";
import { ApiError } from "../utils/api-error.js";

interface ErrorPayload {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

function send(res: Parameters<RequestHandler>[1], status: number, payload: ErrorPayload): void {
  res.status(status).json(payload);
}

export const notFoundHandler: RequestHandler = (_req, res) => {
  send(res, 404, {
    error: { code: "NOT_FOUND", message: "The requested resource could not be found." }
  });
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (res.headersSent) return;

  if (error instanceof ApiError) {
    send(res, error.status, {
      error: { code: error.code, message: error.message, ...(error.details ? { details: error.details } : {}) }
    });
    return;
  }

  if (error instanceof ZodError) {
    send(res, 400, {
      error: {
        code: "VALIDATION_ERROR",
        message: "Some fields need your attention.",
        details: { fieldErrors: error.flatten().fieldErrors }
      }
    });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      send(res, 409, {
        error: { code: "DUPLICATE_RESOURCE", message: "A record with that unique value already exists." }
      });
      return;
    }
    if (error.code === "P2025") {
      send(res, 404, { error: { code: "NOT_FOUND", message: "The requested resource could not be found." } });
      return;
    }
  }

  // Express body-parser surfaces malformed JSON as a SyntaxError with status 400.
  if (error instanceof SyntaxError && "status" in error && (error as { status?: number }).status === 400) {
    send(res, 400, { error: { code: "INVALID_JSON", message: "The request body is not valid JSON." } });
    return;
  }

  // Unexpected failures: log safely (no credentials, no response body) and
  // return a generic message so internals never leak to clients.
  console.error("[api] unhandled error:", error instanceof Error ? error.message : "unknown error");
  if (!env.isProduction && error instanceof Error) {
    console.error(error.stack);
  }

  send(res, 500, {
    error: { code: "INTERNAL_ERROR", message: "Something went wrong on our side. Please try again." }
  });
};
