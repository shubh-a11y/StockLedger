import jwt, { type SignOptions } from "jsonwebtoken";
import type { CookieOptions } from "express";
import type { User } from "@prisma/client";
import { env } from "../../config/env.js";

const ISSUER = "stockledger";

/** Converts "8h" / "30m" / "7d" / "3600" into milliseconds. */
export function durationToMs(value: string): number {
  const match = /^(\d+)\s*([smhd])?$/.exec(value.trim());
  if (!match) return 8 * 60 * 60 * 1000;
  const amount = Number(match[1]);
  const unit = match[2] ?? "s";
  const multiplier = unit === "d" ? 86_400_000 : unit === "h" ? 3_600_000 : unit === "m" ? 60_000 : 1000;
  return amount * multiplier;
}

export function signSessionToken(user: Pick<User, "id" | "role">): string {
  return jwt.sign({ role: user.role }, env.jwtSecret, {
    subject: user.id,
    issuer: ISSUER,
    algorithm: "HS256",
    expiresIn: env.jwtExpiresIn as SignOptions["expiresIn"]
  });
}

export function sessionCookieOptions(): CookieOptions {
  const maxAge = durationToMs(env.jwtExpiresIn);
  return {
    httpOnly: true,
    secure: env.isProduction || env.cookieSameSite === "none",
    sameSite: env.cookieSameSite,
    path: "/api",
    maxAge
  };
}

export function clearedSessionCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.isProduction || env.cookieSameSite === "none",
    sameSite: env.cookieSameSite,
    path: "/api",
    maxAge: 0
  };
}
