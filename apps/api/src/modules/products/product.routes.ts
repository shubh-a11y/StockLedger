import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { ownerOnly } from "../../middleware/authorize.js";
import { validate } from "../../middleware/validate.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { movementListQuerySchema } from "../movements/movement.schemas.js";
import { listForProduct } from "../movements/movement.controller.js";
import * as productController from "./product.controller.js";
import {
  createProductSchema,
  productIdSchema,
  productListQuerySchema,
  updateProductSchema
} from "./product.schemas.js";

export const productRouter = Router();

productRouter.use(authenticate);

productRouter.get(
  "/",
  validate({ query: productListQuerySchema }),
  asyncHandler(productController.list)
);

productRouter.get("/categories", asyncHandler(productController.categories));

productRouter.post(
  "/",
  ownerOnly,
  validate({ body: createProductSchema }),
  asyncHandler(productController.create)
);

productRouter.get(
  "/:id",
  validate({ params: productIdSchema }),
  asyncHandler(productController.detail)
);

productRouter.patch(
  "/:id",
  ownerOnly,
  validate({ params: productIdSchema, body: updateProductSchema }),
  asyncHandler(productController.update)
);

productRouter.delete(
  "/:id",
  ownerOnly,
  validate({ params: productIdSchema }),
  asyncHandler(productController.archive)
);

productRouter.get(
  "/:id/movements",
  validate({ params: productIdSchema, query: movementListQuerySchema }),
  asyncHandler(listForProduct)
);
