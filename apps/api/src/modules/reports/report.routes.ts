import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { ownerOnly } from "../../middleware/authorize.js";
import { asyncHandler } from "../../utils/async-handler.js";
import * as reportController from "./report.controller.js";

export const reportRouter = Router();

reportRouter.use(authenticate);

// Operational overview: both roles need it to run the shop day to day.
reportRouter.get("/dashboard", asyncHandler(reportController.dashboard));

// Owner-only reporting and exports.
reportRouter.get("/low-stock", ownerOnly, asyncHandler(reportController.lowStock));
reportRouter.get("/stock.csv", ownerOnly, asyncHandler(reportController.stockCsv));
