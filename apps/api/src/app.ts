import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { env } from "./config/env.js";
import { prisma } from "./db/prisma.js";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";
import { verifyRequestOrigin } from "./middleware/origin-check.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { movementRouter } from "./modules/movements/movement.routes.js";
import { productRouter } from "./modules/products/product.routes.js";
import { reportRouter } from "./modules/reports/report.routes.js";
import { asyncHandler } from "./utils/async-handler.js";

export const app = express();

app.disable("x-powered-by");
if (env.isProduction) app.set("trust proxy", 1);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: env.isProduction ? undefined : false
  })
);

app.use(
  cors({
    // Explicit allowlist. Credentials are only accepted from these origins;
    // requests with no Origin (curl, server-to-server) are not browsers.
    origin(origin, callback) {
      if (!origin || env.clientOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
    maxAge: 600
  })
);

app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());
app.use(verifyRequestOrigin);

app.get(
  "/api/health",
  asyncHandler(async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.status(200).json({ status: "ok", service: "stockledger-api", database: "up" });
    } catch {
      res.status(503).json({ status: "degraded", service: "stockledger-api", database: "down" });
    }
  })
);

app.use("/api/auth", authRouter);
app.use("/api/products", productRouter);
app.use("/api/movements", movementRouter);
app.use("/api/reports", reportRouter);

app.use(notFoundHandler);
app.use(errorHandler);
