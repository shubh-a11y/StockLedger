import { describe, expect, it } from "vitest";
import { escapeCsvCell, toCsv } from "../src/utils/csv.js";
import { movementFingerprint } from "../src/utils/fingerprint.js";
import { MOVEMENT_SIGN, signedQuantity, stockStatus, sumMovements } from "../src/utils/stock.js";

describe("stock calculation helpers", () => {
  it("derives the sign of every movement type on the server", () => {
    expect(MOVEMENT_SIGN.PURCHASE_IN).toBe(1);
    expect(MOVEMENT_SIGN.RETURN_IN).toBe(1);
    expect(MOVEMENT_SIGN.ADJUSTMENT_IN).toBe(1);
    expect(MOVEMENT_SIGN.SALE_OUT).toBe(-1);
    expect(MOVEMENT_SIGN.ADJUSTMENT_OUT).toBe(-1);
    expect(signedQuantity("SALE_OUT", 4)).toBe(-4);
  });

  it("returns zero for a product with no movements", () => {
    expect(sumMovements([])).toBe(0);
  });

  it("sums mixed movements into the expected balance", () => {
    const balance = sumMovements([
      { type: "PURCHASE_IN", quantity: 20 },
      { type: "SALE_OUT", quantity: 7 },
      { type: "RETURN_IN", quantity: 2 },
      { type: "ADJUSTMENT_OUT", quantity: 1 },
      { type: "ADJUSTMENT_IN", quantity: 3 }
    ]);
    expect(balance).toBe(17);
  });

  it("classifies stock status including zero stock", () => {
    expect(stockStatus(0, 5)).toBe("OUT");
    expect(stockStatus(5, 5)).toBe("LOW");
    expect(stockStatus(4, 5)).toBe("LOW");
    expect(stockStatus(6, 5)).toBe("HEALTHY");
  });
});

describe("CSV export helpers", () => {
  it("escapes commas and quotes per RFC 4180", () => {
    expect(escapeCsvCell('Mug, large "ceramic"')).toBe('"Mug, large ""ceramic"""');
    expect(escapeCsvCell("plain")).toBe("plain");
  });

  it("neutralises spreadsheet formula injection", () => {
    expect(escapeCsvCell("=HYPERLINK(\"http://evil\")")).toContain("'=");
    expect(escapeCsvCell("+1+1")).toBe("'+1+1");
    expect(escapeCsvCell("-2+3")).toBe("'-2+3");
    expect(escapeCsvCell("@SUM(A1)")).toBe("'@SUM(A1)");
  });

  it("writes a header row and CRLF line endings", () => {
    const csv = toCsv(["SKU", "Name"], [["A-1", "Mug"], ["A-2", '=cmd|"x"']]);
    expect(csv.startsWith("SKU,Name\r\n")).toBe(true);
    expect(csv).toContain("A-1,Mug\r\n");
    expect(csv).toContain("'=cmd|\"\"x\"\"");
  });
});

describe("idempotency fingerprints", () => {
  const base = {
    actorId: "u1",
    productId: "p1",
    type: "SALE_OUT",
    quantity: 2,
    reason: "Sale",
    reference: "WEB-1"
  };

  it("is deterministic for the same payload", () => {
    expect(movementFingerprint(base)).toBe(movementFingerprint({ ...base }));
  });

  it("changes when the payload changes", () => {
    expect(movementFingerprint(base)).not.toBe(movementFingerprint({ ...base, quantity: 3 }));
    expect(movementFingerprint(base)).not.toBe(
      movementFingerprint({ ...base, type: "PURCHASE_IN" })
    );
  });
});
