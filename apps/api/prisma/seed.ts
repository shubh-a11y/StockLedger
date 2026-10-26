import "dotenv/config";
import { PrismaClient, UserRole, MovementType } from "@prisma/client";
import argon2 from "argon2";

const prisma = new PrismaClient();

async function main() {
  const ownerEmail = process.env.SEED_OWNER_EMAIL ?? "owner@example.com";
  const staffEmail = process.env.SEED_STAFF_EMAIL ?? "staff@example.com";
  const ownerPassword = process.env.SEED_OWNER_PASSWORD;
  const staffPassword = process.env.SEED_STAFF_PASSWORD;

  if (!ownerPassword || !staffPassword) {
    throw new Error("Set SEED_OWNER_PASSWORD and SEED_STAFF_PASSWORD before seeding.");
  }

  const [ownerHash, staffHash] = await Promise.all([
    argon2.hash(ownerPassword),
    argon2.hash(staffPassword)
  ]);

  const owner = await prisma.user.upsert({
    where: { email: ownerEmail },
    update: { name: "Demo Owner", passwordHash: ownerHash, role: UserRole.OWNER },
    create: { email: ownerEmail, name: "Demo Owner", passwordHash: ownerHash, role: UserRole.OWNER }
  });

  const staff = await prisma.user.upsert({
    where: { email: staffEmail },
    update: { name: "Demo Staff", passwordHash: staffHash, role: UserRole.STAFF },
    create: { email: staffEmail, name: "Demo Staff", passwordHash: staffHash, role: UserRole.STAFF }
  });

  const product = await prisma.product.upsert({
    where: { sku: "DEMO-001" },
    update: {},
    create: {
      sku: "DEMO-001",
      name: "Notebook",
      category: "Stationery",
      unit: "piece",
      price: "45.00",
      lowStockThreshold: 5
    }
  });

  const initialMovement = await prisma.stockMovement.findFirst({
    where: { productId: product.id, reference: "SEED-OPENING-STOCK" }
  });

  if (!initialMovement) {
    await prisma.stockMovement.create({
      data: {
        productId: product.id,
        actorId: owner.id,
        type: MovementType.PURCHASE_IN,
        quantity: 20,
        reason: "Demo opening stock",
        reference: "SEED-OPENING-STOCK"
      }
    });
  }

  console.log(`Seeded owner ${owner.email} and staff ${staff.email}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
