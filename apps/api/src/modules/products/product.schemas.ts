import { z } from "zod";

const priceField = z
  .union([z.number(), z.string().trim().min(1, "Enter a price.")])
  .transform((value) => (typeof value === "number" ? value : Number(value)))
  .refine((value) => Number.isFinite(value) && value >= 0, "Enter a price of zero or more.")
  .refine((value) => value <= 9_999_999_999, "That price is too large.")
  .refine(
    (value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-6,
    "Use at most two decimal places."
  );

const skuField = z
  .string()
  .trim()
  .min(2, "SKU must be at least 2 characters.")
  .max(40, "SKU must be 40 characters or fewer.")
  .regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/, "Use letters, numbers, dots, dashes or underscores.")
  .transform((value) => value.toUpperCase());

export const createProductSchema = z
  .object({
    sku: skuField,
    name: z.string().trim().min(1, "Enter a product name.").max(120, "Name is too long."),
    category: z.string().trim().min(1, "Enter a category.").max(60, "Category is too long."),
    unit: z.string().trim().min(1, "Enter a unit.").max(20, "Unit is too long."),
    price: priceField,
    lowStockThreshold: z.coerce
      .number()
      .int("Threshold must be a whole number.")
      .min(0, "Threshold cannot be negative.")
      .max(1_000_000, "Threshold is too large.")
  })
  .strict();

export const updateProductSchema = createProductSchema
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one field to update."
  });

export const productIdSchema = z.object({
  id: z.string().trim().min(1).max(40)
});

export const productListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    search: z
      .string()
      .trim()
      .max(120)
      .optional()
      .transform((value) => (value ? value : undefined)),
    category: z
      .string()
      .trim()
      .max(60)
      .optional()
      .transform((value) => (value ? value : undefined)),
    stockStatus: z.enum(["all", "low", "out", "healthy"]).default("all"),
    includeArchived: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
    sort: z
      .enum(["name", "sku", "category", "price", "stock", "threshold", "createdAt", "updatedAt"])
      .default("name"),
    order: z.enum(["asc", "desc"]).default("asc")
  })
  .strict();

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductListQuery = z.infer<typeof productListQuerySchema>;
