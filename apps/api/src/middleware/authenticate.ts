import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { prisma } from "../db/prisma.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";

export interface SessionPayload {
  sub: string;
  role: string;
  iss?: string;
}

/**
 * Verifies the signed session cookie and loads the current user from the
 * database. The role is deliberately read from the database on every request,
 * so a role change (or revoked account) takes effect immediately and a stale
 * token can never grant more access than the user currently has.
 */
export const authenticate = asyncHandler(async (req, _res, next) => {
  const cookieValue: unknown = req.cookies?.[env.cookieName];
  if (typeof cookieValue !== "string" || cookieValue.length === 0) {
    throw ApiError.unauthorized();
  }

  let payload: SessionPayload;
  try {
    payload = jwt.verify(cookieValue, env.jwtSecret, {
      algorithms: ["HS256"],
      issuer: "stockledger"
    }) as SessionPayload;
  } catch {
    throw ApiError.unauthorized("Your session has expired. Please sign in again.");
  }

  if (!payload.sub) throw ApiError.unauthorized();

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, email: true, name: true, role: true }
  });

  if (!user) throw ApiError.unauthorized("Your session is no longer valid.");

  req.user = user;
  next();
});
