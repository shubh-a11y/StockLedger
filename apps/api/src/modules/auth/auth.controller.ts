import type { Request, Response } from "express";
import { env } from "../../config/env.js";
import { ApiError } from "../../utils/api-error.js";
import { login as loginService } from "./auth.service.js";
import type { LoginInput } from "./auth.schemas.js";
import { clearedSessionCookieOptions, sessionCookieOptions } from "./session.js";

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as LoginInput;
  const { user, token } = await loginService(email, password);
  res.cookie(env.cookieName, token, sessionCookieOptions());
  res.status(200).json({ user });
}

export function logout(_req: Request, res: Response): void {
  res.clearCookie(env.cookieName, clearedSessionCookieOptions());
  res.status(200).json({ success: true });
}

export function me(req: Request, res: Response): void {
  if (!req.user) throw ApiError.unauthorized();
  res.status(200).json({ user: req.user });
}
