import { z } from "zod";

export const movementInputSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive().max(1_000_000),
  reason: z.string().trim().min(3).max(500),
  reference: z.string().trim().max(120).optional(),
  idempotencyKey: z.string().trim().min(8).max(200).optional()
}).strict();

export type MovementInput = z.infer<typeof movementInputSchema>;
