import type { MovementType } from "@prisma/client";

/**
 * Signed contribution of a movement to the product balance. The sign is
 * always derived on the server from the movement type; clients only ever send
 * positive quantities.
 */
export const MOVEMENT_SIGN: Record<MovementType, 1 | -1> = {
  PURCHASE_IN: 1,
  RETURN_IN: 1,
  ADJUSTMENT_IN: 1,
  SALE_OUT: -1,
  ADJUSTMENT_OUT: -1
};

export const INCOMING_TYPES: readonly MovementType[] = [
  "PURCHASE_IN",
  "RETURN_IN",
  "ADJUSTMENT_IN"
];

export const OUTGOING_TYPES: readonly MovementType[] = ["SALE_OUT", "ADJUSTMENT_OUT"];

/** SQL fragment listing incoming movement types (static, never user input). */
export const INCOMING_SQL = "('PURCHASE_IN','RETURN_IN','ADJUSTMENT_IN')";

export function isIncoming(type: MovementType): boolean {
  return MOVEMENT_SIGN[type] === 1;
}

export function signedQuantity(type: MovementType, quantity: number): number {
  return MOVEMENT_SIGN[type] * quantity;
}

/**
 * Pure balance calculation used by unit tests and any in-memory aggregation.
 * A product with no movements correctly resolves to zero.
 */
export function sumMovements(
  movements: ReadonlyArray<{ type: MovementType; quantity: number }>
): number {
  return movements.reduce((total, movement) => total + signedQuantity(movement.type, movement.quantity), 0);
}

export function stockStatus(stock: number, threshold: number): "OUT" | "LOW" | "HEALTHY" {
  if (stock <= 0) return "OUT";
  if (stock <= threshold) return "LOW";
  return "HEALTHY";
}
