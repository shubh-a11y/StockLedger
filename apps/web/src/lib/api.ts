import type {
  DashboardData,
  LowStockResponse,
  Movement,
  MovementQuery,
  MovementsResponse,
  Product,
  ProductInput,
  ProductsResponse,
  RecordMovementInput,
  RecordMovementResponse,
  StockStatusFilter,
  User
} from "../types";

const API_BASE = (import.meta.env.VITE_API_URL ?? "http://localhost:4000/api").replace(/\/$/, "");

export interface ApiErrorDetails {
  fieldErrors?: Record<string, string[]>;
  [key: string]: unknown;
}

export class ApiRequestError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: ApiErrorDetails;

  constructor(status: number, code: string, message: string, details?: ApiErrorDetails) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

interface ErrorBody {
  error?: { code?: string; message?: string; details?: ApiErrorDetails };
}

type QueryValue = string | number | boolean | undefined | null;

function queryString(params: Record<string, QueryValue>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "" || value === "all") continue;
    search.set(key, String(value));
  }
  const result = search.toString();
  return result ? `?${result}` : "";
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      credentials: "include",
      headers: {
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers
      }
    });
  } catch {
    throw new ApiRequestError(
      0,
      "NETWORK_ERROR",
      "We could not reach the server. Check your connection and try again."
    );
  }

  if (response.status === 401 && !path.startsWith("/auth/login")) {
    window.dispatchEvent(new Event("stockledger:unauthorized"));
  }

  const contentType = response.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json")
    ? ((await response.json().catch(() => null)) as ErrorBody | T | null)
    : null;

  if (!response.ok) {
    const errorBody = body as ErrorBody | null;
    throw new ApiRequestError(
      response.status,
      errorBody?.error?.code ?? "REQUEST_FAILED",
      errorBody?.error?.message ?? "Something went wrong. Please try again.",
      errorBody?.error?.details
    );
  }

  return body as T;
}

export const api = {
  auth: {
    me: async (): Promise<User | null> => {
      try {
        const data = await apiFetch<{ user: User }>("/auth/me");
        return data.user;
      } catch (error) {
        if (error instanceof ApiRequestError && error.status === 401) return null;
        throw error;
      }
    },
    login: (email: string, password: string) =>
      apiFetch<{ user: User }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      }),
    logout: () => apiFetch<{ success: boolean }>("/auth/logout", { method: "POST" })
  },

  products: {
    list: (params: StockStatusFilter = {}) =>
      apiFetch<ProductsResponse>(`/products${queryString(params as Record<string, QueryValue>)}`),
    get: (id: string) => apiFetch<{ product: Product }>(`/products/${id}`),
    create: (input: ProductInput) =>
      apiFetch<{ product: Product }>("/products", {
        method: "POST",
        body: JSON.stringify(input)
      }),
    update: (id: string, input: Partial<ProductInput>) =>
      apiFetch<{ product: Product }>(`/products/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input)
      }),
    archive: (id: string) =>
      apiFetch<{ product: Product }>(`/products/${id}`, { method: "DELETE" })
  },

  movements: {
    list: (params: MovementQuery = {}) =>
      apiFetch<MovementsResponse>(`/movements${queryString(params as Record<string, QueryValue>)}`),
    listForProduct: (productId: string, params: MovementQuery = {}) =>
      apiFetch<MovementsResponse>(
        `/products/${productId}/movements${queryString(params as Record<string, QueryValue>)}`
      ),
    record: (kind: "purchase" | "sale" | "return" | "adjustment", input: RecordMovementInput) =>
      apiFetch<RecordMovementResponse>(`/movements/${kind}`, {
        method: "POST",
        body: JSON.stringify(input)
      })
  },

  reports: {
    dashboard: () => apiFetch<DashboardData>("/reports/dashboard"),
    lowStock: () => apiFetch<LowStockResponse>("/reports/low-stock"),
    downloadCsv: async (): Promise<void> => {
      const response = await fetch(`${API_BASE}/reports/stock.csv`, { credentials: "include" });
      if (!response.ok) {
        let message = "The export could not be generated. Please try again.";
        try {
          const body = (await response.json()) as ErrorBody;
          message = body.error?.message ?? message;
        } catch {
          // Non-JSON error body: keep the safe default message.
        }
        throw new ApiRequestError(response.status, "EXPORT_FAILED", message);
      }

      const disposition = response.headers.get("content-disposition") ?? "";
      const match = /filename="?([^";]+)"?/.exec(disposition);
      const filename = match?.[1] ?? "stockledger-stock.csv";
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    }
  }
};

export function fieldErrorsOf(error: unknown): Record<string, string[]> {
  if (error instanceof ApiRequestError && error.details?.fieldErrors) {
    return error.details.fieldErrors;
  }
  return {};
}

export function movementKindLabel(kind: "purchase" | "sale" | "return" | "adjustment"): string {
  return { purchase: "Purchase", sale: "Sale", return: "Return", adjustment: "Adjustment" }[kind];
}

export type { Movement };
