import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";

export const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
  credentials: true
}));
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "stockledger-api" });
});

// Feature routers will be mounted here as they are implemented.
app.use((_req, res) => {
  res.status(404).json({ error: { code: "NOT_FOUND", message: "Route not found." } });
});
