import type { RequestHandler } from "express";
import { ZodError, type ZodTypeAny } from "zod";
import { ApiError } from "../utils/api-error.js";

interface ValidationSchemas {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

/**
 * Validates request input with Zod. Bodies and params are replaced with the
 * parsed values; the parsed query is stored on `req.validatedQuery` because
 * Express defines `req.query` as a getter.
 */
export function validate(schemas: ValidationSchemas): RequestHandler {
  return (req, _res, next) => {
    try {
      if (schemas.params) {
        req.params = schemas.params.parse(req.params) as Record<string, string>;
      }
      if (schemas.query) {
        req.validatedQuery = schemas.query.parse(req.query);
      }
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const fieldErrors: Record<string, string[]> = {};
        for (const issue of error.issues) {
          const key = issue.path.join(".") || "form";
          fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message];
        }
        next(ApiError.badRequest("Some fields need your attention.", { fieldErrors }));
        return;
      }
      next(error);
    }
  };
}
