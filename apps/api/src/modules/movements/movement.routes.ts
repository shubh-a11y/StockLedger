import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { ownerOnly, ownerOrStaff } from "../../middleware/authorize.js";
import { validate } from "../../middleware/validate.js";
import { asyncHandler } from "../../utils/async-handler.js";
import * as movementController from "./movement.controller.js";
import {
  adjustmentBodySchema,
  movementBodySchema,
  movementListQuerySchema
} from "./movement.schemas.js";

export const movementRouter = Router();

movementRouter.use(authenticate);

movementRouter.get(
  "/",
  validate({ query: movementListQuerySchema }),
  asyncHandler(movementController.list)
);

movementRouter.post(
  "/purchase",
  ownerOnly,
  validate({ body: movementBodySchema }),
  asyncHandler(movementController.purchase)
);

movementRouter.post(
  "/sale",
  ownerOrStaff,
  validate({ body: movementBodySchema }),
  asyncHandler(movementController.sale)
);

movementRouter.post(
  "/return",
  ownerOrStaff,
  validate({ body: movementBodySchema }),
  asyncHandler(movementController.customerReturn)
);

movementRouter.post(
  "/adjustment",
  ownerOnly,
  validate({ body: adjustmentBodySchema }),
  asyncHandler(movementController.adjustment)
);
