import { beforeEach, describe, expect, it } from "vitest";
import {
  api,
  cleanDatabase,
  createProduct,
  loginAgent,
  movementBody,
  prisma
} from "./helpers.js";

describe("authentication", () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  it("logs in with valid credentials, sets an http-only cookie and returns the current user", async () => {
    const actor = await loginAgent("OWNER", { email: "owner-auth@test.local" });

    const me = await actor.agent.get("/api/auth/me");
    expect(me.status).toBe(200);
    expect(me.body.user).toMatchObject({ email: "owner-auth@test.local", role: "OWNER" });
    expect(me.body.user).not.toHaveProperty("passwordHash");

    const login = await api()
      .post("/api/auth/login")
      .send({ email: actor.email, password: actor.password });
    const setCookie = login.headers["set-cookie"] as unknown as string[];
    expect(setCookie.join(";")).toContain("HttpOnly");
    expect(setCookie.join(";")).toContain("SameSite=Lax");
  });

  it("rejects a wrong password without revealing whether the account exists", async () => {
    const actor = await loginAgent("OWNER", { email: "wrong-pass@test.local" });

    const wrongPassword = await api()
      .post("/api/auth/login")
      .send({ email: actor.email, password: "NotThePassword!" });
    const unknownEmail = await api()
      .post("/api/auth/login")
      .send({ email: "nobody@test.local", password: "NotThePassword!" });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body.error.code).toBe("INVALID_CREDENTIALS");
    expect(unknownEmail.body.error.code).toBe("INVALID_CREDENTIALS");
    expect(wrongPassword.body.error.message).toBe(unknownEmail.body.error.message);
  });

  it("requires a session for protected endpoints and clears it on logout", async () => {
    expect((await api().get("/api/products")).status).toBe(401);
    expect((await api().get("/api/movements")).status).toBe(401);
    expect((await api().get("/api/reports/dashboard")).status).toBe(401);

    const actor = await loginAgent("OWNER");
    expect((await actor.agent.get("/api/products")).status).toBe(200);

    expect((await actor.agent.post("/api/auth/logout")).status).toBe(200);
    expect((await actor.agent.get("/api/auth/me")).status).toBe(401);
  });

  it("throttles repeated failed sign-in attempts", async () => {
    const actor = await loginAgent("STAFF", { email: "throttle@test.local" });

    let lastStatus = 0;
    for (let attempt = 0; attempt < 11; attempt += 1) {
      const response = await api()
        .post("/api/auth/login")
        .send({ email: actor.email, password: "wrong-password" });
      lastStatus = response.status;
    }
    expect(lastStatus).toBe(429);
  });

  it("returns field-level validation errors for malformed login input", async () => {
    const response = await api().post("/api/auth/login").send({ email: "not-an-email" });
    expect(response.status).toBe(400);
    expect(response.body.error.details.fieldErrors).toHaveProperty("email");
    expect(response.body.error.details.fieldErrors).toHaveProperty("password");
  });
});

describe("product permissions", () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  it("lets owners create and update products", async () => {
    const owner = await loginAgent("OWNER");
    const created = await owner.agent.post("/api/products").send({
      sku: "own-100",
      name: "Owner Product",
      category: "Testing",
      unit: "unit",
      price: 12.5,
      lowStockThreshold: 3
    });

    expect(created.status).toBe(201);
    expect(created.body.product.stock).toBe(0);
    expect(created.body.product.sku).toBe("OWN-100");

    const updated = await owner.agent
      .patch(`/api/products/${created.body.product.id}`)
      .send({ name: "Renamed Product" });
    expect(updated.status).toBe(200);
    expect(updated.body.product.name).toBe("Renamed Product");
  });

  it("forbids staff from creating or updating products", async () => {
    const staff = await loginAgent("STAFF");
    const product = await createProduct();

    const createAttempt = await staff.agent.post("/api/products").send({
      sku: "staff-100",
      name: "Should Fail",
      category: "Testing",
      unit: "unit",
      price: 1,
      lowStockThreshold: 1
    });
    const updateAttempt = await staff.agent
      .patch(`/api/products/${product.id}`)
      .send({ name: "Hacked" });

    expect(createAttempt.status).toBe(403);
    expect(updateAttempt.status).toBe(403);
    expect((await prisma.product.findUnique({ where: { id: product.id } }))?.name).toBe(
      "Test Product"
    );
  });

  it("forbids staff from recording purchases or adjustments", async () => {
    const staff = await loginAgent("STAFF");
    const product = await createProduct();

    const purchase = await staff.agent
      .post("/api/movements/purchase")
      .send(movementBody(product.id, 5));
    const adjustment = await staff.agent
      .post("/api/movements/adjustment")
      .send({ ...movementBody(product.id, 5), direction: "IN" });

    expect(purchase.status).toBe(403);
    expect(adjustment.status).toBe(403);
    expect(await prisma.stockMovement.count()).toBe(0);
  });

  it("lets staff record sales and customer returns", async () => {
    const owner = await loginAgent("OWNER");
    const staff = await loginAgent("STAFF");
    const product = await createProduct();
    await owner.agent.post("/api/movements/purchase").send(movementBody(product.id, 10));

    const sale = await staff.agent.post("/api/movements/sale").send(movementBody(product.id, 4));
    const returned = await staff.agent
      .post("/api/movements/return")
      .send(movementBody(product.id, 2));

    expect(sale.status).toBe(201);
    expect(sale.body.balance).toBe(6);
    expect(returned.status).toBe(201);
    expect(returned.body.balance).toBe(8);
  });

  it("restricts owner-only reports and CSV exports", async () => {
    const staff = await loginAgent("STAFF");
    const ownerUser = await loginAgent("OWNER");

    expect((await staff.agent.get("/api/reports/low-stock")).status).toBe(403);
    expect((await staff.agent.get("/api/reports/stock.csv")).status).toBe(403);
    expect((await staff.agent.get("/api/reports/dashboard")).status).toBe(200);

    const exportResponse = await ownerUser.agent.get("/api/reports/stock.csv");
    expect(exportResponse.status).toBe(200);
    expect(exportResponse.headers["content-type"]).toContain("text/csv");
    expect(exportResponse.text).toContain("SKU,Name,Category,Unit,Price,Current Stock");
  });
});

describe("product validation", () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  it("returns clear field-level errors for missing product fields", async () => {
    const owner = await loginAgent("OWNER");
    const response = await owner.agent.post("/api/products").send({});

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    const fields = response.body.error.details.fieldErrors;
    expect(fields).toHaveProperty("sku");
    expect(fields).toHaveProperty("name");
    expect(fields).toHaveProperty("price");
  });

  it("rejects duplicate SKUs with a 409 conflict", async () => {
    const owner = await loginAgent("OWNER");
    await createProduct({ sku: "DUP-001" });

    const response = await owner.agent.post("/api/products").send({
      sku: "DUP-001",
      name: "Another",
      category: "Testing",
      unit: "unit",
      price: 5,
      lowStockThreshold: 2
    });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("DUPLICATE_SKU");
  });

  it("exposes no endpoint that writes a stock balance directly", async () => {
    const owner = await loginAgent("OWNER");
    const product = await createProduct();

    const response = await owner.agent
      .patch(`/api/products/${product.id}`)
      .send({ stock: 500 });

    expect(response.status).toBe(400);
  });

  it("archives products while preserving movement history", async () => {
    const owner = await loginAgent("OWNER");
    const product = await createProduct();
    await owner.agent.post("/api/movements/purchase").send(movementBody(product.id, 5));

    const archived = await owner.agent.delete(`/api/products/${product.id}`);
    expect(archived.status).toBe(200);
    expect(archived.body.product.archivedAt).toBeTruthy();

    const list = await owner.agent.get("/api/products");
    expect(list.body.items).toHaveLength(0);

    const movements = await owner.agent.get(`/api/products/${product.id}/movements`);
    expect(movements.status).toBe(200);
    expect(movements.body.items).toHaveLength(1);
  });
});
