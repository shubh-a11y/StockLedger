export type Role = "OWNER" | "STAFF";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export type MovementType =
  | "PURCHASE_IN"
  | "SALE_OUT"
  | "RETURN_IN"
  | "ADJUSTMENT_IN"
  | "ADJUSTMENT_OUT";

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  price: string;
  lowStockThreshold: number;
  stock: number;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductInput {
  sku: string;
  name: string;
  category: string;
  unit: string;
  price: number;
  lowStockThreshold: number;
}

export interface Movement {
  id: string;
  productId: string;
  type: MovementType;
  quantity: number;
  reason: string;
  reference: string | null;
  occurredAt: string;
  createdAt: string;
  product: { id: string; sku: string; name: string; unit: string };
  actor: { id: string; name: string; role: Role };
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ProductsResponse {
  items: Product[];
  pagination: Pagination;
  categories: string[];
}

export interface MovementsResponse {
  items: Movement[];
  pagination: Pagination;
}

export interface DashboardData {
  totals: {
    totalProducts: number;
    totalUnits: number;
    lowStockCount: number;
    outOfStockCount: number;
  };
  lowStock: Product[];
  recentMovements: Movement[];
  activity: Array<{ day: string; incoming: number; outgoing: number }>;
}

export interface LowStockItem extends Product {
  deficit: number;
  status: "OUT" | "LOW" | "HEALTHY";
}

export interface LowStockResponse {
  items: LowStockItem[];
  total: number;
}

export interface StockStatusFilter {
  stockStatus?: "all" | "low" | "out" | "healthy";
  category?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  sort?: "name" | "sku" | "category" | "price" | "stock" | "threshold" | "createdAt" | "updatedAt";
  order?: "asc" | "desc";
  includeArchived?: boolean;
}

export interface MovementQuery {
  page?: number;
  pageSize?: number;
  productId?: string;
  type?: MovementType | "all";
  search?: string;
  from?: string;
  to?: string;
  sort?: "occurredAt" | "quantity";
  order?: "asc" | "desc";
}

export interface RecordMovementInput {
  productId: string;
  quantity: number;
  reason: string;
  reference?: string;
  idempotencyKey?: string;
  direction?: "IN" | "OUT";
}

export interface RecordMovementResponse {
  movement: Movement;
  balance: number;
  replayed: boolean;
}
