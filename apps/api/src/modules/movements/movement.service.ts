import { Prisma, type MovementType } from "@prisma/client";
import type { AuthenticatedUser } from "../../types/express.js";
import { prisma } from "../../db/prisma.js";
import { ApiError } from "../../utils/api-error.js";
import { movementFingerprint } from "../../utils/fingerprint.js";
import { MOVEMENT_SIGN } from "../../utils/stock.js";
import * as movementRepository from "./movement.repository.js";
import type { MovementListQuery } from "./movement.schemas.js";

/** Movement types each role may record. Enforced here as well as in routes. */
const STAFF_ALLOWED_TYPES: readonly MovementType[] = ["SALE_OUT", "RETURN_IN"];

export function assertCanRecordMovement(role: AuthenticatedUser["role"], type: MovementType): void {
  if (role === "STAFF" && !STAFF_ALLOWED_TYPES.includes(type)) {
    throw ApiError.forbidden(`Staff cannot record ${type.replaceAll("_", " ").toLowerCase()} movements.`);
  }
}

interface RecordMovementParams {
  actor: AuthenticatedUser;
  productId: string;
  type: MovementType;
  quantity: number;
  reason: string;
  reference?: string;
  idempotencyKey?: string;
}

export interface RecordMovementResult {
  movement: ReturnType<typeof movementRepository.serializeMovement>;
  balance: number;
  replayed: boolean;
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

function isRetryableTransactionError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") return true;
  const message = error instanceof Error ? error.message : "";
  return /40001|40P01|deadlock/i.test(message);
}

async function runTransaction<T>(
  callback: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  const attempts = 3;
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await prisma.$transaction(callback, { maxWait: 5_000, timeout: 10_000 });
    } catch (error) {
      if (attempt < attempts && isRetryableTransactionError(error)) continue;
      throw error;
    }
  }
}

/**
 * Records one movement atomically.
 *
 * Protocol (identical for every stock-changing operation):
 *   1. short transaction
 *   2. `SELECT ... FOR UPDATE` on the product row  -> serialises sales per product
 *   3. idempotency lookup / replay detection        -> safe retries
 *   4. authoritative balance from the movement ledger (SUM), never a cached column
 *   5. reject negative resulting balance
 *   6. insert the movement (positive quantity, server-chosen type)
 *   7. commit; any failure rolls the whole transaction back
 */
export async function recordMovement(params: RecordMovementParams): Promise<RecordMovementResult> {
  const { actor, productId, type, quantity, reason, reference, idempotencyKey } = params;

  assertCanRecordMovement(actor.role, type);

  const fingerprint = movementFingerprint({ productId, type, quantity, reason, reference });

  const buildReplay = (
    existing: movementRepository.MovementWithRelations,
    balance: number
  ): RecordMovementResult => {
    if (existing.requestFingerprint && existing.requestFingerprint !== fingerprint) {
      throw ApiError.conflict(
        "IDEMPOTENCY_KEY_REUSED",
        "This idempotency key was already used for a different movement.",
        { idempotencyKey }
      );
    }
    return {
      movement: movementRepository.serializeMovement(existing),
      balance,
      replayed: true
    };
  };

  try {
    return await runTransaction(async (tx) => {
      // Lock first: every writer for this product queues here, so the balance
      // read below cannot be invalidated by a concurrent writer.
      const product = await movementRepository.lockProduct(tx, productId);
      if (!product) throw ApiError.notFound("Product not found.");

      if (idempotencyKey) {
        const existing = await movementRepository.findByIdempotencyKey(tx, idempotencyKey);
        if (existing) {
          const balance = await movementRepository.getProductBalance(tx, existing.productId);
          return buildReplay(existing, balance);
        }
      }

      if (product.archivedAt) {
        throw ApiError.conflict("PRODUCT_ARCHIVED", "This product is archived and cannot move stock.");
      }

      const balance = await movementRepository.getProductBalance(tx, productId);
      const sign = MOVEMENT_SIGN[type];

      if (sign < 0 && balance < quantity) {
        throw ApiError.conflict("INSUFFICIENT_STOCK", "There is not enough stock for this movement.", {
          availableStock: balance,
          requestedQuantity: quantity
        });
      }

      const movement = await movementRepository.createMovement(tx, {
        productId,
        actorId: actor.id,
        type,
        quantity,
        reason,
        reference,
        idempotencyKey,
        requestFingerprint: fingerprint
      });

      return {
        movement: movementRepository.serializeMovement(movement),
        balance: balance + sign * quantity,
        replayed: false
      };
    });
  } catch (error) {
    // A concurrent retry with the same key lost the unique-constraint race.
    // The transaction rolled back, so resolve the original request here.
    if (isUniqueViolation(error) && idempotencyKey) {
      const existing = await prisma.stockMovement.findUnique({
        where: { idempotencyKey },
        include: movementRepository.movementInclude
      });
      if (existing) {
        const balance = await movementRepository.getProductBalance(prisma, existing.productId);
        return buildReplay(existing, balance);
      }
    }
    throw error;
  }
}

export async function listMovements(query: MovementListQuery) {
  const { items, total } = await movementRepository.listMovements(query);
  return {
    items: items.map(movementRepository.serializeMovement),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize))
    }
  };
}

export async function listProductMovements(productId: string, query: MovementListQuery) {
  const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
  if (!product) throw ApiError.notFound("Product not found.");

  const { items, total } = await movementRepository.listMovements(query, productId);
  return {
    items: items.map(movementRepository.serializeMovement),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize))
    }
  };
}
