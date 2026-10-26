import argon2 from "argon2";
import request from "supertest";
import type { Agent } from "supertest";
import { MovementType, Prisma, UserRole } from "@prisma/client";
import { app } from "../src/app.js";
import { prisma } from "../src/db/prisma.js";
import { resetRateLimits } from "../src/middleware/rate-limit.js";

export { app, prisma };
export const api = () => request(app);

let skuCounter = 0;

/** Fast argon2 parameters: tests do not need production work factors. */
export function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, { memoryCost: 8_192, timeCost: 2 });
}

export async function cleanDatabase(): Promise<void> {
  skuCounter = 0;
  resetRateLimits();
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "StockMovement", "Product", "User" RESTART IDENTITY CASCADE'
  );
}

export async function createUser(
  role: UserRole,
  overrides: { email?: string; name?: string; password?: string } = {}
) {
  const email = overrides.email ?? `${role.toLowerCase()}-${Date.now()}-${Math.random().toString(16).slice(2)}@test.local`;
  const password = overrides.password ?? "TestPassword123!";
  return prisma.user.create({
    data: {
      email,
      name: overrides.name ?? `Test ${role}`,
      role,
      passwordHash: await hashPassword(password)
    }
  });
}

export async function createProduct(
  overrides: Partial<{
    sku: string;
    name: string;
    category: string;
    unit: string;
    price: string;
    lowStockThreshold: number;
  }> = {}
) {
  skuCounter += 1;
  return prisma.product.create({
    data: {
      sku: overrides.sku ?? `TEST-${String(skuCounter).padStart(4, "0")}`,
      name: overrides.name ?? "Test Product",
      category: overrides.category ?? "Testing",
      unit: overrides.unit ?? "unit",
      price: overrides.price ?? "10.00",
      lowStockThreshold: overrides.lowStockThreshold ?? 5
    }
  });
}

export async function addMovement(
  productId: string,
  actorId: string,
  type: MovementType,
  quantity: number
) {
  return prisma.stockMovement.create({
    data: {
      productId,
      actorId,
      type,
      quantity,
      reason: "Fixture movement",
      occurredAt: new Date()
    }
  });
}

export interface TestActor {
  id: string;
  email: string;
  password: string;
  agent: Agent;
}

export async function loginAgent(
  role: UserRole,
  overrides: { email?: string; name?: string; password?: string } = {}
): Promise<TestActor> {
  const user = await createUser(role, overrides);
  const password = overrides.password ?? "TestPassword123!";
  const agent = request.agent(app);
  const response = await agent.post("/api/auth/login").send({ email: user.email, password });
  if (response.status !== 200) {
    throw new Error(`Test login failed: ${response.status} ${JSON.stringify(response.body)}`);
  }
  return { id: user.id, email: user.email, password, agent };
}

export async function getStock(agent: Agent, productId: string): Promise<number> {
  const response = await agent.get(`/api/products/${productId}`);
  if (response.status !== 200) {
    throw new Error(`Failed to read product: ${response.status} ${JSON.stringify(response.body)}`);
  }
  return response.body.product.stock as number;
}

export function movementBody(productId: string, quantity: number, extra: Record<string, unknown> = {}) {
  return {
    productId,
    quantity,
    reason: "Test movement reason",
    ...extra
  };
}

export const decimal = (value: string) => new Prisma.Decimal(value);
