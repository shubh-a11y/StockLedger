import { createHash } from "node:crypto";

/**
 * Deterministic SHA-256 fingerprint of a movement request payload. The actor
 * is part of the fingerprint so an idempotency key is effectively scoped to
 * the user who created it: another user cannot replay it into a different
 * outcome or probe its payload.
 */
export function movementFingerprint(payload: {
  actorId: string;
  productId: string;
  type: string;
  quantity: number;
  reason: string;
  reference?: string | null;
}): string {
  const canonical = JSON.stringify({
    actorId: payload.actorId,
    productId: payload.productId,
    type: payload.type,
    quantity: payload.quantity,
    reason: payload.reason.trim(),
    reference: payload.reference?.trim() ?? null
  });
  return createHash("sha256").update(canonical).digest("hex");
}
