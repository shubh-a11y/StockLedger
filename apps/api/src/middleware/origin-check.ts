import type { RequestHandler } from "express";
import { env } from "../config/env.js";
import { ApiError } from "../utils/api-error.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * CSRF defence for cookie-based auth: state-changing requests must originate
 * from one of the configured browser origins. Combined with `SameSite=Lax`
 * cookies this blocks cross-site form/XHR submissions. Non-browser clients
 * (curl, tests) that send no Origin header are allowed; browsers always send
 * one for cross-origin requests, and we reject foreign origins.
 */
export const verifyRequestOrigin: RequestHandler = (req, _res, next) => {
  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }

  const origin = req.get("origin");
  if (!origin) {
    next();
    return;
  }

  if (!env.clientOrigins.includes(origin)) {
    next(ApiError.forbidden("Request origin is not allowed."));
    return;
  }

  next();
};
