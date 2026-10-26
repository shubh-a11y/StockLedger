import type { RequestHandler } from "express";
import { ApiError } from "../utils/api-error.js";

interface Bucket {
  count: number;
  resetAt: number;
}

/**
 * Small single-process sliding-window limiter. Sufficient for brute-force
 * mitigation on one API instance; for multi-instance deployments use a shared
 * store (Redis) in front of the same middleware contract.
 */
const buckets = new Map<string, Bucket>();

export function resetRateLimits(): void {
  buckets.clear();
}

export function rateLimit(options: {
  windowMs: number;
  max: number;
  key: (req: Parameters<RequestHandler>[0]) => string;
}): RequestHandler {
  return (req, res, next) => {
    const now = Date.now();
    const key = options.key(req);
    const existing = buckets.get(key);

    if (!existing || existing.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + options.windowMs });
      next();
      return;
    }

    existing.count += 1;
    if (existing.count > options.max) {
      const retryAfter = Math.ceil((existing.resetAt - now) / 1000);
      res.setHeader("Retry-After", String(retryAfter));
      next(ApiError.tooManyRequests("Too many sign-in attempts. Please wait and try again."));
      return;
    }

    next();
  };
}

/** Rate limit sign-in attempts per IP + email pair. */
export const loginRateLimit = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  key: (req) => {
    const body = req.body as { email?: unknown } | undefined;
    const email = typeof body?.email === "string" ? body.email.toLowerCase() : "unknown";
    return `login:${req.ip ?? "ip"}:${email}`;
  }
});
