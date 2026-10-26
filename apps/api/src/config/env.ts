import "dotenv/config";
import { z } from "zod";

/**
 * Central, validated configuration. The process fails fast (with a clear
 * message) when a required environment variable is missing or unsafe, rather
 * than starting in a broken state.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  API_PORT: z.coerce.number().int().positive().max(65535).default(4000),
  CLIENT_ORIGIN: z.string().min(1).default("http://localhost:5173"),
  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET must be at least 32 characters long"),
  JWT_EXPIRES_IN: z.string().default("8h"),
  COOKIE_NAME: z.string().min(1).default("stockledger_session"),
  // `none` requires HTTPS + Secure and is only needed when the web app and
  // API are served from different sites (not merely different ports).
  COOKIE_SAMESITE: z.enum(["lax", "strict", "none"]).default("lax")
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");
  // eslint-disable-next-line no-console
  console.error(`Invalid environment configuration:\n${issues}`);
  throw new Error("Invalid environment configuration. See .env.example.");
}

const raw = parsed.data;

export const env = {
  nodeEnv: raw.NODE_ENV,
  isProduction: raw.NODE_ENV === "production",
  isTest: raw.NODE_ENV === "test",
  databaseUrl: raw.DATABASE_URL,
  port: raw.API_PORT,
  /** Explicit allowlist of browser origins permitted to send cookies. */
  clientOrigins: raw.CLIENT_ORIGIN.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  jwtSecret: raw.JWT_SECRET,
  jwtExpiresIn: raw.JWT_EXPIRES_IN,
  cookieName: raw.COOKIE_NAME,
  cookieSameSite: raw.COOKIE_SAMESITE
} as const;
