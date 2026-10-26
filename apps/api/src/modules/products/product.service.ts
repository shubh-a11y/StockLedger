import { Prisma } from "@prisma/client";
import type { UserRole } from "@prisma/client";
import { ApiError } from "../../utils/api-error.js";
import * as productRepository from "./product.repository.js";
import type {
  CreateProductInput,
  ProductListQuery,
  UpdateProductInput
} from "./product.schemas.js";
import type { ProductRow } from "./product.repository.js";

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export function serializeProduct(product: ProductRow) {
  return {
    id: product.id,
    sku: product.sku,
    name: product.name,
    category: product.category,
    unit: product.unit,
    price: product.price,
    lowStockThreshold: product.lowStockThreshold,
    stock: product.stock,
    archivedAt: product.archivedAt?.toISOString() ?? null,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString()
  };
}

export async function listProducts(query: ProductListQuery, role: UserRole) {
  // Only owners can see archived products; staff always get the active catalog.
  const effectiveQuery: ProductListQuery =
    role === "OWNER" ? query : { ...query, includeArchived: false };

  const { items, total } = await productRepository.listProducts(effectiveQuery);
  const categories = await productRepository.listCategories();

  return {
    items: items.map(serializeProduct),
    pagination: {
      page: effectiveQuery.page,
      pageSize: effectiveQuery.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / effectiveQuery.pageSize))
    },
    categories
  };
}

export async function listCategories(): Promise<string[]> {
  return productRepository.listCategories();
}

export async function getProduct(id: string) {
  const product = await productRepository.findProductById(id);
  if (!product) throw ApiError.notFound("Product not found.");
  return serializeProduct(product);
}

export async function createProduct(input: CreateProductInput) {
  try {
    const product = await productRepository.createProduct(input);
    return serializeProduct(product);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw ApiError.conflict("DUPLICATE_SKU", "A product with that SKU already exists.", {
        fieldErrors: { sku: ["This SKU is already in use."] }
      });
    }
    throw error;
  }
}

export async function updateProduct(id: string, input: UpdateProductInput) {
  const existing = await productRepository.findProductById(id);
  if (!existing) throw ApiError.notFound("Product not found.");

  try {
    const product = await productRepository.updateProduct(id, input);
    if (!product) throw ApiError.notFound("Product not found.");
    return serializeProduct(product);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw ApiError.conflict("DUPLICATE_SKU", "A product with that SKU already exists.", {
        fieldErrors: { sku: ["This SKU is already in use."] }
      });
    }
    throw error;
  }
}

/**
 * Products are archived rather than hard-deleted so their movement history and
 * audit trail stay intact (StockMovement has ON DELETE RESTRICT). Archived
 * products disappear from active inventory lists and reports but remain
 * queryable by owners.
 */
export async function archiveProduct(id: string) {
  const existing = await productRepository.findProductById(id);
  if (!existing) throw ApiError.notFound("Product not found.");
  if (existing.archivedAt) return serializeProduct(existing);

  const archived = await productRepository.archiveProduct(id);
  if (!archived) throw ApiError.notFound("Product not found.");
  return serializeProduct(archived);
}
