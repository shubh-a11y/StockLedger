import { beforeEach, describe, expect, it } from "vitest";
import {
  addMovement,
  cleanDatabase,
  createProduct,
  getStock,
  loginAgent,
  movementBody,
  prisma,
  type TestActor
} from "./helpers.js";

let owner: TestActor;
let staff: TestActor;

beforeEach(async () => {
  await cleanDatabase();
  owner = await loginAgent("OWNER");
  staff = await loginAgent("STAFF");
});

describe("stock movement calculations", () => {
  it("increases stock on a purchase", async () => {
    const product = await createProduct();

    const response = await owner.agent
      .post("/api/movements/purchase")
      .send(movementBody(product.id, 25, { reference: "PO-77" }));

    expect(response.status).toBe(201);
    expect(response.body.balance).toBe(25);
    expect(await getStock(owner.agent, product.id)).toBe(25);

    const movements = await owner.agent.get(`/api/products/${product.id}/movements`);
    expect(movements.body.items[0]).toMatchObject({
      type: "PURCHASE_IN",
      quantity: 25,
      reference: "PO-77",
      actor: { role: "OWNER" }
    });
  });

  it("decreases stock on a sale", async () => {
    const product = await createProduct();
    await owner.agent.post("/api/movements/purchase").send(movementBody(product.id, 10));

    const sale = await staff.agent.post("/api/movements/sale").send(movementBody(product.id, 3));

    expect(sale.status).toBe(201);
    expect(sale.body.balance).toBe(7);
    expect(await getStock(staff.agent, product.id)).toBe(7);
  });

  it("increases stock on a customer return", async () => {
    const product = await createProduct();
    await owner.agent.post("/api/movements/purchase").send(movementBody(product.id, 10));
    await staff.agent.post("/api/movements/sale").send(movementBody(product.id, 4));

    const returned = await staff.agent
      .post("/api/movements/return")
      .send(movementBody(product.id, 2));

    expect(returned.status).toBe(201);
    expect(await getStock(owner.agent, product.id)).toBe(8);
  });

  it("applies adjustments in the explicitly requested direction", async () => {
    const product = await createProduct();
    await owner.agent.post("/api/movements/purchase").send(movementBody(product.id, 10));

    const adjustIn = await owner.agent
      .post("/api/movements/adjustment")
      .send({ ...movementBody(product.id, 3), direction: "IN" });
    expect(adjustIn.status).toBe(201);
    expect(adjustIn.body.balance).toBe(13);

    const adjustOut = await owner.agent
      .post("/api/movements/adjustment")
      .send({ ...movementBody(product.id, 5), direction: "OUT" });
    expect(adjustOut.status).toBe(201);
    expect(adjustOut.body.balance).toBe(8);

    const types = await prisma.stockMovement.findMany({
      where: { productId: product.id },
      orderBy: { createdAt: "asc" },
      select: { type: true }
    });
    expect(types.map((row) => row.type)).toEqual([
      "PURCHASE_IN",
      "ADJUSTMENT_IN",
      "ADJUSTMENT_OUT"
    ]);
  });

  it("rejects an adjustment without an explicit direction", async () => {
    const product = await createProduct();
    const response = await owner.agent
      .post("/api/movements/adjustment")
      .send(movementBody(product.id, 1));

    expect(response.status).toBe(400);
    expect(response.body.error.details.fieldErrors).toHaveProperty("direction");
  });

  it("reports zero stock for a product with no movements", async () => {
    const product = await createProduct();
    expect(await getStock(owner.agent, product.id)).toBe(0);
  });
});

describe("invalid movements", () => {
  it("rejects a sale that exceeds available stock and records nothing", async () => {
    const product = await createProduct();
    await owner.agent.post("/api/movements/purchase").send(movementBody(product.id, 2));

    const response = await staff.agent
      .post("/api/movements/sale")
      .send(movementBody(product.id, 3));

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("INSUFFICIENT_STOCK");
    expect(response.body.error.details).toMatchObject({
      availableStock: 2,
      requestedQuantity: 3
    });

    expect(await getStock(owner.agent, product.id)).toBe(2);
    expect(await prisma.stockMovement.count({ where: { productId: product.id } })).toBe(1);
  });

  it.each([
    ["zero", 0],
    ["negative", -5],
    ["fractional", 1.5],
    ["excessively large", 1_000_001],
    ["string", "5"]
  ])("rejects a %s quantity", async (_label, quantity) => {
    const product = await createProduct();
    await owner.agent.post("/api/movements/purchase").send(movementBody(product.id, 10));

    const response = await staff.agent
      .post("/api/movements/sale")
      .send({ ...movementBody(product.id, 1), quantity });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(await prisma.stockMovement.count({ where: { productId: product.id } })).toBe(1);
  });

  it("rejects an adjustment out that would drive stock negative", async () => {
    const product = await createProduct();
    await owner.agent.post("/api/movements/purchase").send(movementBody(product.id, 2));

    const response = await owner.agent
      .post("/api/movements/adjustment")
      .send({ ...movementBody(product.id, 3), direction: "OUT" });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("INSUFFICIENT_STOCK");
  });

  it("does not leave partial writes when a movement is rejected", async () => {
    const product = await createProduct();
    await owner.agent.post("/api/movements/purchase").send(movementBody(product.id, 1));

    const before = await prisma.stockMovement.count();
    await staff.agent.post("/api/movements/sale").send(movementBody(product.id, 5));
    const after = await prisma.stockMovement.count();

    expect(after).toBe(before);
  });
});

describe("concurrency control", () => {
  it("does not oversell when two users race for the final unit", async () => {
    const product = await createProduct();
    await addMovement(product.id, owner.id, "PURCHASE_IN", 1);

    const [ownerAttempt, staffAttempt] = await Promise.all([
      owner.agent.post("/api/movements/sale").send(movementBody(product.id, 1)),
      staff.agent.post("/api/movements/sale").send(movementBody(product.id, 1))
    ]);

    const statuses = [ownerAttempt.status, staffAttempt.status].sort();
    expect(statuses).toEqual([201, 409]);

    const rejected = ownerAttempt.status === 409 ? ownerAttempt : staffAttempt;
    expect(rejected.body.error.code).toBe("INSUFFICIENT_STOCK");

    expect(await getStock(owner.agent, product.id)).toBe(0);
    const sales = await prisma.stockMovement.count({
      where: { productId: product.id, type: "SALE_OUT" }
    });
    expect(sales).toBe(1);
  });

  it("serialises several simultaneous sales so the ledger never goes negative", async () => {
    const product = await createProduct();
    await owner.agent.post("/api/movements/purchase").send(movementBody(product.id, 5));

    const results = await Promise.all(
      Array.from({ length: 8 }, () =>
        staff.agent.post("/api/movements/sale").send(movementBody(product.id, 1))
      )
    );

    const successes = results.filter((response) => response.status === 201).length;
    expect(successes).toBe(5);
    expect(results.filter((response) => response.status === 409).length).toBe(3);
    expect(await getStock(owner.agent, product.id)).toBe(0);

    const sales = await prisma.stockMovement.count({
      where: { productId: product.id, type: "SALE_OUT" }
    });
    expect(sales).toBe(5);
  });
});

describe("idempotency", () => {
  it("does not duplicate a movement when the same key is retried", async () => {
    const product = await createProduct();
    await owner.agent.post("/api/movements/purchase").send(movementBody(product.id, 10));
    const key = "sale-retry-key-0001";

    const first = await staff.agent
      .post("/api/movements/sale")
      .send(movementBody(product.id, 2, { idempotencyKey: key }));
    const retry = await staff.agent
      .post("/api/movements/sale")
      .send(movementBody(product.id, 2, { idempotencyKey: key }));

    expect(first.status).toBe(201);
    expect(first.body.replayed).toBe(false);
    expect(retry.status).toBe(200);
    expect(retry.body.replayed).toBe(true);
    expect(retry.body.movement.id).toBe(first.body.movement.id);

    expect(
      await prisma.stockMovement.count({ where: { productId: product.id, type: "SALE_OUT" } })
    ).toBe(1);
    expect(await getStock(owner.agent, product.id)).toBe(8);
  });

  it("returns a conflict when a key is reused with a different payload", async () => {
    const product = await createProduct();
    await owner.agent.post("/api/movements/purchase").send(movementBody(product.id, 10));
    const key = "sale-retry-key-0002";

    await staff.agent
      .post("/api/movements/sale")
      .send(movementBody(product.id, 2, { idempotencyKey: key }));

    const conflict = await staff.agent
      .post("/api/movements/sale")
      .send(movementBody(product.id, 3, { idempotencyKey: key }));

    expect(conflict.status).toBe(409);
    expect(conflict.body.error.code).toBe("IDEMPOTENCY_KEY_REUSED");
    expect(await getStock(owner.agent, product.id)).toBe(8);
  });

  it("scopes an idempotency key to the actor who created it", async () => {
    const product = await createProduct();
    await owner.agent.post("/api/movements/purchase").send(movementBody(product.id, 10));
    const key = "actor-scoped-key-01";

    await owner.agent
      .post("/api/movements/sale")
      .send(movementBody(product.id, 2, { idempotencyKey: key }));

    const replayByStaff = await staff.agent
      .post("/api/movements/sale")
      .send(movementBody(product.id, 2, { idempotencyKey: key }));

    expect(replayByStaff.status).toBe(409);
    expect(replayByStaff.body.error.code).toBe("IDEMPOTENCY_KEY_REUSED");
  });

  it("resolves concurrent retries with one stored movement", async () => {
    const product = await createProduct();
    await owner.agent.post("/api/movements/purchase").send(movementBody(product.id, 10));
    const key = "sale-concurrent-key-01";

    const [first, second] = await Promise.all([
      staff.agent
        .post("/api/movements/sale")
        .send(movementBody(product.id, 2, { idempotencyKey: key })),
      staff.agent
        .post("/api/movements/sale")
        .send(movementBody(product.id, 2, { idempotencyKey: key }))
    ]);

    expect([first.status, second.status].sort()).toEqual([200, 201]);
    expect(
      await prisma.stockMovement.count({ where: { productId: product.id, type: "SALE_OUT" } })
    ).toBe(1);
  });
});

describe("reports and ledger queries", () => {
  it("computes low-stock products from calculated stock and each threshold", async () => {
    const low = await createProduct({ name: "Low Item", lowStockThreshold: 5 });
    const healthy = await createProduct({ name: "Healthy Item", lowStockThreshold: 5 });
    const empty = await createProduct({ name: "Empty Item", lowStockThreshold: 2 });

    await owner.agent.post("/api/movements/purchase").send(movementBody(low.id, 3));
    await owner.agent.post("/api/movements/purchase").send(movementBody(healthy.id, 6));

    const report = await owner.agent.get("/api/reports/low-stock");
    expect(report.status).toBe(200);

    const skus = report.body.items.map((item: { sku: string }) => item.sku);
    expect(skus).toContain(low.sku);
    expect(skus).toContain(empty.sku);
    expect(skus).not.toContain(healthy.sku);

    const emptyItem = report.body.items.find((item: { sku: string }) => item.sku === empty.sku);
    expect(emptyItem).toMatchObject({ stock: 0, lowStockThreshold: 2, deficit: 2, status: "OUT" });
  });

  it("returns dashboard totals derived from the ledger", async () => {
    const first = await createProduct({ lowStockThreshold: 5 });
    const second = await createProduct({ lowStockThreshold: 100 });
    // A product with no movements must count as zero stock, not be skipped by
    // NULL comparisons in the aggregate.
    const neverMoved = await createProduct({ lowStockThreshold: 3 });
    await owner.agent.post("/api/movements/purchase").send(movementBody(first.id, 10));
    await owner.agent.post("/api/movements/purchase").send(movementBody(second.id, 2));
    await staff.agent.post("/api/movements/sale").send(movementBody(first.id, 4));

    const response = await owner.agent.get("/api/reports/dashboard");
    expect(response.status).toBe(200);
    expect(response.body.totals).toMatchObject({
      totalProducts: 3,
      totalUnits: 8,
      // second: 2 <= 100; neverMoved: 0 <= 3; first: 6 > 5 is healthy
      lowStockCount: 2,
      outOfStockCount: 1
    });
    expect(response.body.lowStock.map((product: { id: string }) => product.id)).toContain(
      neverMoved.id
    );
    expect(response.body.recentMovements).toHaveLength(3);
    expect(response.body.activity).toHaveLength(14);
  });

  it("supports filtering and pagination on the movement ledger", async () => {
    const product = await createProduct();
    await owner.agent
      .post("/api/movements/purchase")
      .send(movementBody(product.id, 10, { reason: "Supplier delivery" }));
    await staff.agent
      .post("/api/movements/sale")
      .send(movementBody(product.id, 2, { reason: "Walk-in customer" }));

    const filtered = await owner.agent.get("/api/movements?type=SALE_OUT&search=Walk-in");
    expect(filtered.status).toBe(200);
    expect(filtered.body.items).toHaveLength(1);
    expect(filtered.body.items[0].type).toBe("SALE_OUT");
    expect(filtered.body.pagination.total).toBe(1);

    const paged = await owner.agent.get("/api/movements?page=1&pageSize=1");
    expect(paged.body.items).toHaveLength(1);
    expect(paged.body.pagination.total).toBe(2);
    expect(paged.body.pagination.totalPages).toBe(2);
  });

  it("filters products by calculated stock status", async () => {
    const out = await createProduct({ lowStockThreshold: 5 });
    const low = await createProduct({ lowStockThreshold: 5 });
    const healthy = await createProduct({ lowStockThreshold: 5 });
    await owner.agent.post("/api/movements/purchase").send(movementBody(low.id, 2));
    await owner.agent.post("/api/movements/purchase").send(movementBody(healthy.id, 8));

    const lowList = await owner.agent.get("/api/products?stockStatus=low");
    expect(lowList.body.items.map((item: { id: string }) => item.id)).toEqual([low.id]);

    const outList = await owner.agent.get("/api/products?stockStatus=out");
    expect(outList.body.items.map((item: { id: string }) => item.id)).toEqual([out.id]);

    const healthyList = await owner.agent.get("/api/products?stockStatus=healthy");
    expect(healthyList.body.items.map((item: { id: string }) => item.id)).toEqual([healthy.id]);
  });

  it("neutralises formula injection in the CSV export", async () => {
    const ownerOnly = await loginAgent("OWNER", { email: "csv-owner@test.local" });
    await createProduct({ sku: "CSV-001", name: "=HYPERLINK(\"http://evil\")" });

    const response = await ownerOnly.agent.get("/api/reports/stock.csv");
    expect(response.status).toBe(200);
    expect(response.headers["content-disposition"]).toContain("stockledger-stock-");
    expect(response.text).toContain("'=HYPERLINK");
    expect(response.text).not.toContain("\n=HYPERLINK");
  });
});
