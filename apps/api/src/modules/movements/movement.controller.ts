import type { Request, Response } from "express";
import type { MovementType } from "@prisma/client";
import type { AuthenticatedUser } from "../../types/express.js";
import { ApiError } from "../../utils/api-error.js";
import * as movementService from "./movement.service.js";
import type { AdjustmentBody, MovementBody, MovementListQuery } from "./movement.schemas.js";

function actor(req: Request): AuthenticatedUser {
  if (!req.user) throw ApiError.unauthorized();
  return req.user;
}

async function record(
  req: Request,
  res: Response,
  type: MovementType,
  body: MovementBody
): Promise<void> {
  const result = await movementService.recordMovement({
    actor: actor(req),
    productId: body.productId,
    type,
    quantity: body.quantity,
    reason: body.reason,
    reference: body.reference,
    idempotencyKey: body.idempotencyKey
  });

  res.status(result.replayed ? 200 : 201).json({
    movement: result.movement,
    balance: result.balance,
    replayed: result.replayed
  });
}

export async function purchase(req: Request, res: Response): Promise<void> {
  await record(req, res, "PURCHASE_IN", req.body as MovementBody);
}

export async function sale(req: Request, res: Response): Promise<void> {
  await record(req, res, "SALE_OUT", req.body as MovementBody);
}

export async function customerReturn(req: Request, res: Response): Promise<void> {
  await record(req, res, "RETURN_IN", req.body as MovementBody);
}

export async function adjustment(req: Request, res: Response): Promise<void> {
  const { direction, ...body } = req.body as AdjustmentBody;
  await record(req, res, direction === "IN" ? "ADJUSTMENT_IN" : "ADJUSTMENT_OUT", body);
}

export async function list(req: Request, res: Response): Promise<void> {
  const query = req.validatedQuery as MovementListQuery;
  const result = await movementService.listMovements(query);
  res.status(200).json(result);
}

export async function listForProduct(req: Request, res: Response): Promise<void> {
  const query = req.validatedQuery as MovementListQuery;
  const result = await movementService.listProductMovements(req.params.id as string, query);
  res.status(200).json(result);
}
