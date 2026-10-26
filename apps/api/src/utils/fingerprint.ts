import { createHash } from "node:crypto";

/** Deterministic SHA-256 fingerprint of a movement request payload. */
export function movementFingerprint(payload: {
  productId: string;
  type: string;
  quantity: number;
  reason: string;
  reference?: string | null;
}): string {
  const canonical = JSON.stringify({
    productId: payload.productId,
    type: payload.type,
    quantity: payload.quantity,
    reason: payload.reason.trim(),
    reference: payload.reference?.trim() ?? null
  });
  return createHash("sha256").update(canonical).digest("hex");
}
