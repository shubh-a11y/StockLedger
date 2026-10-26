import type { Request, Response } from "express";
import * as reportService from "./report.service.js";

export async function dashboard(_req: Request, res: Response): Promise<void> {
  res.status(200).json(await reportService.getDashboard());
}

export async function lowStock(_req: Request, res: Response): Promise<void> {
  res.status(200).json(await reportService.getLowStockReport());
}

export async function stockCsv(_req: Request, res: Response): Promise<void> {
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${reportService.stockCsvFilename()}"`
  );
  res.setHeader("Cache-Control", "no-store");
  res.status(200);

  for await (const chunk of reportService.streamStockCsv()) {
    res.write(chunk);
  }

  res.end();
}
