import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { INCOMING_SQL } from "../../utils/stock.js";
import type { ProductListQuery, CreateProductInput, UpdateProductInput } from "./product.schemas.js";

export interface ProductRow {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  price: string;
  lowStockThreshold: number;
  stock: number;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const BALANCE_JOIN = Prisma.sql`
  LEFT JOIN (
    SELECT "productId",
           SUM(CASE WHEN "type" IN ${Prisma.raw(INCOMING_SQL)} THEN "quantity" ELSE -"quantity" END)::int AS stock
    FROM "StockMovement"
    GROUP BY "productId"
  ) b ON b."productId" = p.id
`;

const STOCK_EXPR = Prisma.sql`COALESCE(b.stock, 0)`;

const SORT_COLUMNS: Record<ProductListQuery["sort"], Prisma.Sql> = {
  name: Prisma.sql`p."name"`,
  sku: Prisma.sql`p."sku"`,
  category: Prisma.sql`p."category"`,
  price: Prisma.sql`p."price"`,
  stock: STOCK_EXPR,
  threshold: Prisma.sql`p."lowStockThreshold"`,
  createdAt: Prisma.sql`p."createdAt"`,
  updatedAt: Prisma.sql`p."updatedAt"`
};

function buildConditions(query: ProductListQuery): Prisma.Sql {
  const conditions: Prisma.Sql[] = [];

  if (!query.includeArchived) {
    conditions.push(Prisma.sql`p."archivedAt" IS NULL`);
  }

  if (query.search) {
    const term = `%${query.search}%`;
    conditions.push(Prisma.sql`(p."name" ILIKE ${term} OR p."sku" ILIKE ${term})`);
  }

  if (query.category) {
    conditions.push(Prisma.sql`p."category" = ${query.category}`);
  }

  if (query.stockStatus === "out") {
    conditions.push(Prisma.sql`${STOCK_EXPR} <= 0`);
  } else if (query.stockStatus === "low") {
    conditions.push(Prisma.sql`${STOCK_EXPR} > 0 AND ${STOCK_EXPR} <= p."lowStockThreshold"`);
  } else if (query.stockStatus === "healthy") {
    conditions.push(Prisma.sql`${STOCK_EXPR} > p."lowStockThreshold"`);
  }

  if (conditions.length === 0) return Prisma.empty;
  return Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`;
}

export async function listProducts(
  query: ProductListQuery
): Promise<{ items: ProductRow[]; total: number }> {
  const where = buildConditions(query);
  const offset = (query.page - 1) * query.pageSize;
  const sortColumn = SORT_COLUMNS[query.sort];
  const direction = query.order === "asc" ? Prisma.sql`ASC` : Prisma.sql`DESC`;

  const items = await prisma.$queryRaw<ProductRow[]>(Prisma.sql`
    SELECT p."id", p."sku", p."name", p."category", p."unit",
           p."price"::text AS "price", p."lowStockThreshold",
           ${STOCK_EXPR}::int AS "stock",
           p."archivedAt", p."createdAt", p."updatedAt"
    FROM "Product" p
    ${BALANCE_JOIN}
    ${where}
    ORDER BY ${sortColumn} ${direction}, p."id" ASC
    LIMIT ${query.pageSize} OFFSET ${offset}
  `);

  const countRows = await prisma.$queryRaw<Array<{ count: number }>>(Prisma.sql`
    SELECT COUNT(*)::int AS "count"
    FROM (
      SELECT p."id"
      FROM "Product" p
      ${BALANCE_JOIN}
      ${where}
    ) sub
  `);

  return { items, total: countRows[0]?.count ?? 0 };
}

export async function findProductById(id: string): Promise<ProductRow | null> {
  const rows = await prisma.$queryRaw<ProductRow[]>(Prisma.sql`
    SELECT p."id", p."sku", p."name", p."category", p."unit",
           p."price"::text AS "price", p."lowStockThreshold",
           ${STOCK_EXPR}::int AS "stock",
           p."archivedAt", p."createdAt", p."updatedAt"
    FROM "Product" p
    ${BALANCE_JOIN}
    WHERE p."id" = ${id}
    LIMIT 1
  `);
  return rows[0] ?? null;
}

export async function listCategories(): Promise<string[]> {
  const rows = await prisma.product.findMany({
    where: { archivedAt: null },
    select: { category: true },
    distinct: ["category"],
    orderBy: { category: "asc" }
  });
  return rows.map((row) => row.category);
}

export async function createProduct(input: CreateProductInput): Promise<ProductRow> {
  const product = await prisma.product.create({
    data: {
      sku: input.sku,
      name: input.name,
      category: input.category,
      unit: input.unit,
      price: new Prisma.Decimal(input.price.toFixed(2)),
      lowStockThreshold: input.lowStockThreshold
    }
  });

  return {
    id: product.id,
    sku: product.sku,
    name: product.name,
    category: product.category,
    unit: product.unit,
    price: product.price.toFixed(2),
    lowStockThreshold: product.lowStockThreshold,
    stock: 0,
    archivedAt: product.archivedAt,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt
  };
}

export async function updateProduct(id: string, input: UpdateProductInput): Promise<ProductRow | null> {
  const data: Prisma.ProductUpdateInput = {};
  if (input.sku !== undefined) data.sku = input.sku;
  if (input.name !== undefined) data.name = input.name;
  if (input.category !== undefined) data.category = input.category;
  if (input.unit !== undefined) data.unit = input.unit;
  if (input.price !== undefined) data.price = new Prisma.Decimal(input.price.toFixed(2));
  if (input.lowStockThreshold !== undefined) data.lowStockThreshold = input.lowStockThreshold;

  await prisma.product.update({ where: { id }, data });
  return findProductById(id);
}

export async function archiveProduct(id: string): Promise<ProductRow | null> {
  await prisma.product.update({ where: { id }, data: { archivedAt: new Date() } });
  return findProductById(id);
}

/** Products at or below their configured threshold, including zero-stock items. */
export async function listLowStockProducts(limit = 100): Promise<ProductRow[]> {
  return prisma.$queryRaw<ProductRow[]>(Prisma.sql`
    SELECT p."id", p."sku", p."name", p."category", p."unit",
           p."price"::text AS "price", p."lowStockThreshold",
           ${STOCK_EXPR}::int AS "stock",
           p."archivedAt", p."createdAt", p."updatedAt"
    FROM "Product" p
    ${BALANCE_JOIN}
    WHERE p."archivedAt" IS NULL AND ${STOCK_EXPR} <= p."lowStockThreshold"
    ORDER BY (${STOCK_EXPR} - p."lowStockThreshold") ASC, p."name" ASC
    LIMIT ${limit}
  `);
}

export interface InventoryTotals {
  totalProducts: number;
  totalUnits: number;
  lowStockCount: number;
  outOfStockCount: number;
}

export async function inventoryTotals(): Promise<InventoryTotals> {
  const rows = await prisma.$queryRaw<
    Array<{ totalProducts: number; totalUnits: number; lowStockCount: number; outOfStockCount: number }>
  >(Prisma.sql`
    SELECT
      COUNT(*)::int AS "totalProducts",
      COALESCE(SUM(balance.stock), 0)::int AS "totalUnits",
      COUNT(*) FILTER (WHERE balance.stock <= p."lowStockThreshold")::int AS "lowStockCount",
      COUNT(*) FILTER (WHERE balance.stock <= 0)::int AS "outOfStockCount"
    FROM "Product" p
    LEFT JOIN (
      SELECT "productId",
             SUM(CASE WHEN "type" IN ${Prisma.raw(INCOMING_SQL)} THEN "quantity" ELSE -"quantity" END)::int AS stock
      FROM "StockMovement"
      GROUP BY "productId"
    ) balance ON balance."productId" = p."id"
    WHERE p."archivedAt" IS NULL
  `);

  return (
    rows[0] ?? { totalProducts: 0, totalUnits: 0, lowStockCount: 0, outOfStockCount: 0 }
  );
}
