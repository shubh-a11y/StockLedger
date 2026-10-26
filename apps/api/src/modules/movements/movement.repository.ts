import { Prisma, type MovementType } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { INCOMING_SQL } from "../../utils/stock.js";
import type { MovementListQuery } from "./movement.schemas.js";

export const movementInclude = {
  product: { select: { id: true, sku: true, name: true, unit: true } },
  actor: { select: { id: true, name: true, role: true } }
} satisfies Prisma.StockMovementInclude;

export type MovementWithRelations = Prisma.StockMovementGetPayload<{
  include: typeof movementInclude;
}>;

/**
 * Authoritative balance for one product, derived from the movement ledger.
 * COALESCE handles a product with no movements (SQL SUM returns NULL).
 * `::int` keeps the value a JS number instead of a BigInt.
 */
export async function getProductBalance(
  db: Prisma.TransactionClient,
  productId: string
): Promise<number> {
  const rows = await db.$queryRaw<Array<{ balance: number }>>(Prisma.sql`
    SELECT COALESCE(
      SUM(CASE WHEN "type" IN ${Prisma.raw(INCOMING_SQL)} THEN "quantity" ELSE -"quantity" END),
      0
    )::int AS "balance"
    FROM "StockMovement"
    WHERE "productId" = ${productId}
  `);
  return rows[0]?.balance ?? 0;
}

/** Acquires the row-level product lock that serialises all stock changes. */
export async function lockProduct(
  tx: Prisma.TransactionClient,
  productId: string
): Promise<{ id: string; archivedAt: Date | null } | null> {
  const rows = await tx.$queryRaw<Array<{ id: string; archivedAt: Date | null }>>(Prisma.sql`
    SELECT "id", "archivedAt" FROM "Product" WHERE "id" = ${productId} FOR UPDATE
  `);
  return rows[0] ?? null;
}

export async function findByIdempotencyKey(
  db: Prisma.TransactionClient,
  idempotencyKey: string
): Promise<MovementWithRelations | null> {
  return db.stockMovement.findUnique({ where: { idempotencyKey }, include: movementInclude });
}

export async function createMovement(
  tx: Prisma.TransactionClient,
  data: {
    productId: string;
    actorId: string;
    type: MovementType;
    quantity: number;
    reason: string;
    reference?: string;
    idempotencyKey?: string;
    requestFingerprint?: string;
  }
): Promise<MovementWithRelations> {
  return tx.stockMovement.create({
    data: {
      productId: data.productId,
      actorId: data.actorId,
      type: data.type,
      quantity: data.quantity,
      reason: data.reason,
      reference: data.reference,
      idempotencyKey: data.idempotencyKey,
      requestFingerprint: data.requestFingerprint
    },
    include: movementInclude
  });
}

function buildMovementWhere(query: MovementListQuery): Prisma.StockMovementWhereInput {
  const where: Prisma.StockMovementWhereInput = {};

  if (query.productId) where.productId = query.productId;
  if (query.type !== "all") where.type = query.type;
  if (query.actorId) where.actorId = query.actorId;

  if (query.search) {
    where.OR = [
      { reason: { contains: query.search, mode: "insensitive" } },
      { reference: { contains: query.search, mode: "insensitive" } },
      { product: { name: { contains: query.search, mode: "insensitive" } } },
      { product: { sku: { contains: query.search, mode: "insensitive" } } }
    ];
  }

  if (query.from || query.to) {
    where.occurredAt = {
      ...(query.from ? { gte: new Date(query.from) } : {}),
      ...(query.to ? { lte: new Date(query.to) } : {})
    };
  }

  return where;
}

export async function listMovements(
  query: MovementListQuery,
  scopedProductId?: string
): Promise<{ items: MovementWithRelations[]; total: number }> {
  const where = buildMovementWhere(scopedProductId ? { ...query, productId: scopedProductId } : query);
  const orderBy: Prisma.StockMovementOrderByWithRelationInput =
    query.sort === "quantity" ? { quantity: query.order } : { occurredAt: query.order };

  const [items, total] = await prisma.$transaction([
    prisma.stockMovement.findMany({
      where,
      include: movementInclude,
      orderBy: [orderBy, { createdAt: "desc" }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize
    }),
    prisma.stockMovement.count({ where })
  ]);

  return { items, total };
}

export async function recentMovements(limit: number): Promise<MovementWithRelations[]> {
  return prisma.stockMovement.findMany({
    include: movementInclude,
    orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
    take: limit
  });
}

export interface DailyActivity {
  day: string;
  incoming: number;
  outgoing: number;
}

/** Last N days of incoming/outgoing quantities, with empty days filled by SQL. */
export async function dailyActivity(days: number): Promise<DailyActivity[]> {
  const rows = await prisma.$queryRaw<DailyActivity[]>(Prisma.sql`
    WITH day_series AS (
      SELECT generate_series(
        (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date - (${days}::int - 1),
        (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date,
        INTERVAL '1 day'
      )::date AS day
    )
    SELECT
      to_char(d.day, 'YYYY-MM-DD') AS "day",
      COALESCE(SUM(CASE WHEN m."type" IN ${Prisma.raw(INCOMING_SQL)} THEN m."quantity" END), 0)::int AS "incoming",
      COALESCE(SUM(CASE WHEN m."type" IN ('SALE_OUT','ADJUSTMENT_OUT') THEN m."quantity" END), 0)::int AS "outgoing"
    FROM day_series d
    LEFT JOIN "StockMovement" m
      ON m."occurredAt" >= (d.day::timestamp AT TIME ZONE 'UTC')
     AND m."occurredAt" < ((d.day + 1)::timestamp AT TIME ZONE 'UTC')
    GROUP BY d.day
    ORDER BY d.day ASC
  `);
  return rows;
}

export function serializeMovement(movement: MovementWithRelations) {
  return {
    id: movement.id,
    productId: movement.productId,
    type: movement.type,
    quantity: movement.quantity,
    reason: movement.reason,
    reference: movement.reference,
    occurredAt: movement.occurredAt.toISOString(),
    createdAt: movement.createdAt.toISOString(),
    product: movement.product,
    actor: movement.actor
  };
}
