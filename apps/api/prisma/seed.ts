import "dotenv/config";
import { MovementType, PrismaClient, UserRole } from "@prisma/client";
import argon2 from "argon2";

const prisma = new PrismaClient();

interface SeedProduct {
  sku: string;
  name: string;
  category: string;
  unit: string;
  price: string;
  lowStockThreshold: number;
}

const PRODUCTS: SeedProduct[] = [
  { sku: "ELEC-001", name: "Wireless Mouse", category: "Electronics", unit: "unit", price: "24.99", lowStockThreshold: 10 },
  { sku: "ELEC-002", name: "USB-C Charging Cable", category: "Electronics", unit: "unit", price: "9.50", lowStockThreshold: 5 },
  { sku: "ELEC-003", name: "Bluetooth Speaker", category: "Electronics", unit: "unit", price: "59.00", lowStockThreshold: 8 },
  { sku: "GROC-001", name: "Arabica Coffee Beans 1kg", category: "Groceries", unit: "bag", price: "14.75", lowStockThreshold: 12 },
  { sku: "GROC-002", name: "Barista Oat Milk 1L", category: "Groceries", unit: "carton", price: "3.40", lowStockThreshold: 10 },
  { sku: "STAT-001", name: "A5 Hardcover Notebook", category: "Stationery", unit: "piece", price: "4.25", lowStockThreshold: 10 },
  { sku: "STAT-002", name: "Gel Pen Pack (5)", category: "Stationery", unit: "pack", price: "6.99", lowStockThreshold: 15 },
  { sku: "APPA-001", name: "Organic Cotton T-Shirt", category: "Apparel", unit: "piece", price: "18.00", lowStockThreshold: 6 },
  { sku: "APPA-002", name: "Denim Jacket", category: "Apparel", unit: "piece", price: "74.50", lowStockThreshold: 4 },
  { sku: "HOME-001", name: "Ceramic Mug", category: "Home", unit: "piece", price: "12.00", lowStockThreshold: 8 },
  { sku: "HOME-002", name: "Scented Soy Candle", category: "Home", unit: "piece", price: "22.50", lowStockThreshold: 6 },
  { sku: "HOME-003", name: "Woven Storage Basket", category: "Home", unit: "piece", price: "16.00", lowStockThreshold: 5 }
];

interface SeedMovement {
  sku: string;
  type: MovementType;
  quantity: number;
  daysAgo: number;
  reason: string;
  reference?: string;
  by: "owner" | "staff" | "staff2";
}

const MOVEMENTS: SeedMovement[] = [
  { sku: "ELEC-001", type: "PURCHASE_IN", quantity: 40, daysAgo: 28, reason: "Opening stock purchase", reference: "PO-1001", by: "owner" },
  { sku: "ELEC-001", type: "SALE_OUT", quantity: 8, daysAgo: 20, reason: "Retail sale", reference: "WEB-2041", by: "staff" },
  { sku: "ELEC-001", type: "SALE_OUT", quantity: 6, daysAgo: 12, reason: "Retail sale", reference: "WEB-2098", by: "staff" },
  { sku: "ELEC-001", type: "RETURN_IN", quantity: 1, daysAgo: 9, reason: "Customer return - faulty dongle", reference: "RET-312", by: "staff" },
  { sku: "ELEC-001", type: "PURCHASE_IN", quantity: 15, daysAgo: 5, reason: "Restock from supplier", reference: "PO-1054", by: "owner" },
  { sku: "ELEC-001", type: "SALE_OUT", quantity: 5, daysAgo: 1, reason: "Retail sale", reference: "WEB-2187", by: "staff" },

  { sku: "ELEC-002", type: "PURCHASE_IN", quantity: 20, daysAgo: 25, reason: "Opening stock purchase", reference: "PO-1002", by: "owner" },
  { sku: "ELEC-002", type: "SALE_OUT", quantity: 10, daysAgo: 18, reason: "Retail sale", reference: "WEB-2055", by: "staff2" },
  { sku: "ELEC-002", type: "SALE_OUT", quantity: 7, daysAgo: 6, reason: "Retail sale", reference: "WEB-2140", by: "staff" },

  { sku: "ELEC-003", type: "PURCHASE_IN", quantity: 12, daysAgo: 22, reason: "Opening stock purchase", reference: "PO-1003", by: "owner" },
  { sku: "ELEC-003", type: "SALE_OUT", quantity: 3, daysAgo: 10, reason: "Retail sale", reference: "WEB-2079", by: "staff2" },
  { sku: "ELEC-003", type: "ADJUSTMENT_OUT", quantity: 1, daysAgo: 4, reason: "Damaged in transit", reference: "ADJ-221", by: "owner" },

  { sku: "GROC-001", type: "PURCHASE_IN", quantity: 60, daysAgo: 27, reason: "Opening stock purchase", reference: "PO-1004", by: "owner" },
  { sku: "GROC-001", type: "SALE_OUT", quantity: 22, daysAgo: 16, reason: "Wholesale order", reference: "WEB-2067", by: "staff" },
  { sku: "GROC-001", type: "SALE_OUT", quantity: 15, daysAgo: 8, reason: "Retail sale", reference: "WEB-2121", by: "staff2" },
  { sku: "GROC-001", type: "RETURN_IN", quantity: 3, daysAgo: 3, reason: "Customer return - unopened", reference: "RET-330", by: "staff" },

  { sku: "GROC-002", type: "PURCHASE_IN", quantity: 24, daysAgo: 24, reason: "Opening stock purchase", reference: "PO-1005", by: "owner" },
  { sku: "GROC-002", type: "SALE_OUT", quantity: 14, daysAgo: 14, reason: "Retail sale", reference: "WEB-2060", by: "staff" },
  { sku: "GROC-002", type: "SALE_OUT", quantity: 10, daysAgo: 2, reason: "Cafe supply order", reference: "WEB-2199", by: "staff2" },

  { sku: "STAT-001", type: "PURCHASE_IN", quantity: 50, daysAgo: 26, reason: "Opening stock purchase", reference: "PO-1006", by: "owner" },
  { sku: "STAT-001", type: "SALE_OUT", quantity: 12, daysAgo: 13, reason: "Retail sale", reference: "WEB-2062", by: "staff" },

  { sku: "STAT-002", type: "PURCHASE_IN", quantity: 30, daysAgo: 21, reason: "Opening stock purchase", reference: "PO-1007", by: "owner" },
  { sku: "STAT-002", type: "SALE_OUT", quantity: 12, daysAgo: 11, reason: "School order", reference: "WEB-2081", by: "staff2" },
  { sku: "STAT-002", type: "SALE_OUT", quantity: 10, daysAgo: 7, reason: "Retail sale", reference: "WEB-2130", by: "staff" },

  { sku: "APPA-001", type: "PURCHASE_IN", quantity: 25, daysAgo: 20, reason: "Opening stock purchase", reference: "PO-1008", by: "owner" },
  { sku: "APPA-001", type: "SALE_OUT", quantity: 6, daysAgo: 5, reason: "Retail sale", reference: "WEB-2160", by: "staff" },
  { sku: "APPA-001", type: "RETURN_IN", quantity: 2, daysAgo: 2, reason: "Customer return - wrong size", reference: "RET-341", by: "staff" },

  { sku: "APPA-002", type: "PURCHASE_IN", quantity: 10, daysAgo: 19, reason: "Opening stock purchase", reference: "PO-1009", by: "owner" },
  { sku: "APPA-002", type: "SALE_OUT", quantity: 6, daysAgo: 9, reason: "Retail sale", reference: "WEB-2074", by: "staff2" },

  { sku: "HOME-001", type: "PURCHASE_IN", quantity: 24, daysAgo: 17, reason: "Opening stock purchase", reference: "PO-1010", by: "owner" },
  { sku: "HOME-001", type: "SALE_OUT", quantity: 9, daysAgo: 6, reason: "Cafe supply order", reference: "WEB-2145", by: "staff" },

  { sku: "HOME-002", type: "PURCHASE_IN", quantity: 18, daysAgo: 15, reason: "Opening stock purchase", reference: "PO-1011", by: "owner" },
  { sku: "HOME-002", type: "SALE_OUT", quantity: 6, daysAgo: 4, reason: "Retail sale", reference: "WEB-2177", by: "staff2" },
  { sku: "HOME-002", type: "ADJUSTMENT_OUT", quantity: 2, daysAgo: 1, reason: "Broken during shelf restock", reference: "ADJ-229", by: "owner" }

  // HOME-003 intentionally has no movements: demonstrates zero stock with an
  // empty ledger rather than a history that nets to zero.
];

function daysAgoDate(days: number): Date {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  date.setUTCHours(12, 0, 0, 0);
  return date;
}

async function main(): Promise<void> {
  const ownerEmail = (process.env.SEED_OWNER_EMAIL ?? "owner@example.com").toLowerCase();
  const ownerPassword = process.env.SEED_OWNER_PASSWORD;
  const staffEmail = (process.env.SEED_STAFF_EMAIL ?? "staff@example.com").toLowerCase();
  const staffPassword = process.env.SEED_STAFF_PASSWORD;
  const staff2Email = (process.env.SEED_STAFF2_EMAIL ?? "staff2@example.com").toLowerCase();
  const staff2Password = process.env.SEED_STAFF2_PASSWORD ?? staffPassword;

  if (!ownerPassword || !staffPassword || !staff2Password) {
    throw new Error(
      "Set SEED_OWNER_PASSWORD, SEED_STAFF_PASSWORD and SEED_STAFF2_PASSWORD before seeding."
    );
  }

  const [ownerHash, staffHash, staff2Hash] = await Promise.all([
    argon2.hash(ownerPassword),
    argon2.hash(staffPassword),
    argon2.hash(staff2Password)
  ]);

  const owner = await prisma.user.upsert({
    where: { email: ownerEmail },
    update: { name: "Avery Stone", passwordHash: ownerHash, role: UserRole.OWNER },
    create: { email: ownerEmail, name: "Avery Stone", passwordHash: ownerHash, role: UserRole.OWNER }
  });

  const staff = await prisma.user.upsert({
    where: { email: staffEmail },
    update: { name: "Priya Raman", passwordHash: staffHash, role: UserRole.STAFF },
    create: { email: staffEmail, name: "Priya Raman", passwordHash: staffHash, role: UserRole.STAFF }
  });

  const staff2 = await prisma.user.upsert({
    where: { email: staff2Email },
    update: { name: "Marco Silva", passwordHash: staff2Hash, role: UserRole.STAFF },
    create: { email: staff2Email, name: "Marco Silva", passwordHash: staff2Hash, role: UserRole.STAFF }
  });

  const actors = { owner, staff, staff2 } as const;
  const products = new Map<string, string>();

  for (const product of PRODUCTS) {
    const row = await prisma.product.upsert({
      where: { sku: product.sku },
      update: {
        name: product.name,
        category: product.category,
        unit: product.unit,
        price: product.price,
        lowStockThreshold: product.lowStockThreshold
      },
      create: product
    });
    products.set(product.sku, row.id);
  }

  const movements = MOVEMENTS.map((movement, index) => ({
    productId: products.get(movement.sku) as string,
    actorId: actors[movement.by].id,
    type: movement.type,
    quantity: movement.quantity,
    reason: movement.reason,
    reference: movement.reference ?? null,
    // Stable per-index seed key makes re-runs idempotent.
    idempotencyKey: `seed:${movement.sku}:${movement.type}:${index}`,
    occurredAt: daysAgoDate(movement.daysAgo),
    createdAt: daysAgoDate(movement.daysAgo),
    requestFingerprint: null
  }));

  const created = await prisma.stockMovement.createMany({
    data: movements,
    skipDuplicates: true
  });

  console.log(
    `Seed complete. Users: ${owner.email} (owner), ${staff.email}, ${staff2.email} (staff). ` +
      `Products ensured: ${PRODUCTS.length}. New movements created: ${created.count}.`
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
