import type { UserRole } from "@prisma/client";

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      /** Populated by the validate() middleware after Zod parsing. */
      validatedQuery?: unknown;
    }
  }
}
