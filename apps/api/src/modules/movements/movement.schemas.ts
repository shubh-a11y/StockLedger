import { z } from "zod";

const MOVEMENT_TYPES = [
  "PURCHASE_IN",
  "SALE_OUT",
  "RETURN_IN",
  "ADJUSTMENT_IN",
  "ADJUSTMENT_OUT"
] as const;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value ? value : undefined));

export const movementBodySchema = z
  .object({
    productId: z.string().trim().min(1, "Choose a product.").max(40),
    quantity: z
      .number({ invalid_type_error: "Quantity must be a number." })
      .int("Quantity must be a whole number.")
      .positive("Quantity must be greater than zero.")
      .max(1_000_000, "Quantity is too large."),
    reason: z
      .string()
      .trim()
      .min(3, "Add a short reason (at least 3 characters).")
      .max(500, "Reason is too long."),
    reference: optionalText(120),
    idempotencyKey: z
      .string()
      .trim()
      .min(8, "Idempotency key is too short.")
      .max(200)
      .optional()
      .transform((value) => (value ? value : undefined))
  })
  .strict();

export const adjustmentBodySchema = movementBodySchema
  .extend({
    direction: z.enum(["IN", "OUT"], {
      errorMap: () => ({ message: "Choose whether stock increases or decreases." })
    })
  })
  .strict();

export const movementListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    productId: z
      .string()
      .trim()
      .max(40)
      .optional()
      .transform((value) => (value ? value : undefined)),
    type: z.enum(["all", ...MOVEMENT_TYPES]).default("all"),
    actorId: z
      .string()
      .trim()
      .max(40)
      .optional()
      .transform((value) => (value ? value : undefined)),
    search: z
      .string()
      .trim()
      .max(120)
      .optional()
      .transform((value) => (value ? value : undefined)),
    from: z.string().datetime({ offset: true }).optional(),
    to: z.string().datetime({ offset: true }).optional(),
    sort: z.enum(["occurredAt", "quantity"]).default("occurredAt"),
    order: z.enum(["asc", "desc"]).default("desc")
  })
  .strict();

export type MovementBody = z.infer<typeof movementBodySchema>;
export type AdjustmentBody = z.infer<typeof adjustmentBodySchema>;
export type MovementListQuery = z.infer<typeof movementListQuerySchema>;

export type MovementTypeName = (typeof MOVEMENT_TYPES)[number];
