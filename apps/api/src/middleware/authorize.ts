import type { RequestHandler } from "express";
import type { UserRole } from "@prisma/client";
import { ApiError } from "../utils/api-error.js";

/**
 * Central role gate. Use after `authenticate`. Authorization is always based
 * on the server-loaded `req.user`, never on request body/query/header values.
 */
export function requireRole(...roles: UserRole[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) {
      next(ApiError.unauthorized());
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(ApiError.forbidden("Your role does not allow this operation."));
      return;
    }
    next();
  };
}

export const ownerOnly = requireRole("OWNER");
export const ownerOrStaff = requireRole("OWNER", "STAFF");
