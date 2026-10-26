import "dotenv/config";
import { app } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./db/prisma.js";

async function start(): Promise<void> {
  // Fail clearly at boot if the database is unreachable or unconfigured.
  await prisma.$connect();

  const server = app.listen(env.port, () => {
    console.log(
      `[api] StockLedger API listening on http://localhost:${env.port} (${env.nodeEnv})`
    );
  });

  const shutdown = (signal: string) => {
    console.log(`[api] ${signal} received, shutting down gracefully…`);
    server.close(() => {
      prisma
        .$disconnect()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
    });
    // Force exit if connections refuse to drain.
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

start().catch(async (error: unknown) => {
  console.error("[api] Failed to start:", error instanceof Error ? error.message : error);
  await prisma.$disconnect().catch(() => undefined);
  process.exit(1);
});
