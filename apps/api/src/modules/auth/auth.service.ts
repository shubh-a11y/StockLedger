import argon2 from "argon2";
import type { UserRole } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { ApiError } from "../../utils/api-error.js";
import { signSessionToken } from "./session.js";

export interface AuthenticatedUserView {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

let dummyHashPromise: Promise<string> | null = null;

/**
 * Verifying against a dummy hash on unknown emails keeps the response time for
 * "no such user" close to "wrong password", avoiding an account enumeration
 * signal through timing. The error message is identical in both cases.
 */
async function verifyAgainstDummy(password: string): Promise<void> {
  dummyHashPromise ??= argon2.hash("stockledger-timing-equalisation-placeholder");
  const hash = await dummyHashPromise;
  try {
    await argon2.verify(hash, password);
  } catch {
    // Timing equalisation only; the result is intentionally ignored.
  }
}

export async function login(
  email: string,
  password: string
): Promise<{ user: AuthenticatedUserView; token: string }> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, role: true, passwordHash: true }
  });

  if (!user) {
    await verifyAgainstDummy(password);
    throw new ApiError(401, "INVALID_CREDENTIALS", "Email or password is incorrect.");
  }

  const valid = await argon2.verify(user.passwordHash, password).catch(() => false);
  if (!valid) {
    throw new ApiError(401, "INVALID_CREDENTIALS", "Email or password is incorrect.");
  }

  return {
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    token: signSessionToken(user)
  };
}
