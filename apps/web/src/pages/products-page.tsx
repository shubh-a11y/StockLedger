import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Archive,
  Boxes,
  ChevronRight,
  PackageSearch,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  X
} from "lucide-react";
import type { Product, StockStatusFilter } from "../types";
import { api } from "../lib/api";
import { useAuth } from "../hooks/use-auth";
import {
  cn,
  formatCurrency,
  formatNumber,
  formatDate
} from "../lib/utils";
import { PageHeader } from "../components/page-header";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Select } from "../components/ui/select";
import { Badge, StockBadge } from "../components/ui/badge";
import { TableSkeleton } from "../components/ui/skeleton";
import { EmptyState, ErrorState } from "../components/ui/states";
import { Pagination } from "../components/ui/pagination";
import { ProductFormDialog } from "../components/products/product-form-dialog";

const SORT_OPTIONS = [
  { value: "name:asc", label: "Name · A to Z" },
  { value: "name:desc", label: "Name · Z to A" },
  { value: "stock:asc", label: "Stock · low to high" },
  { value: "stock:desc", label: "Stock · high to low" },
  { value: "price:asc", label: "Price · low to high" },
  { value: "updatedAt:desc", label: "Recently updated" }
];

interface ProductsQueryState {
  page: number;
  search: string;
  searchInput: string;
  category: string;
  stockStatus: "all" | "low" | "out" | "healthy";
  sort: string;
  includeArchived: boolean;
}

const INITIAL_STATE: ProductsQueryState = {
  page: 1,
  search: "",
  searchInput: "",
  category: "",
  stockStatus: "all",
  sort: "name:asc",
  includeArchived: false
};

export function ProductsPage() {
  const { user } = useAuth();
  const isOwner = user?.role === "OWNER";
  const [state, setState] = useState<ProductsQueryState>(INITIAL_STATE);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  // Debounce the search box without blocking typing.
  useEffect(() => {
    const timer = setTimeout(() => {
      setState((current) =>
        current.search === current.searchInput
          ? current
          : { ...current, search: current.searchInput, page: 1 }
      );
    }, 320);
    return () => clearTimeout(timer);
  }, [state.searchInput]);

  const [sortField, sortOrder] = state.sort.split(":") as [
    NonNullable<StockStatusFilter["sort"]>,
    "asc" | "desc"
  ];

  const filters: StockStatusFilter = useMemo(
    () => ({
      page: state.page,
      pageSize: 10,
      search: state.search || undefined,
      category: state.category || undefined,
      stockStatus: state.stockStatus,
      sort: sortField,
      order: sortOrder,
      ...(isOwner && state.includeArchived ? { includeArchived: true } : {})
    }),
    [state.page, state.search, state.category, state.stockStatus, sortField, sortOrder, isOwner, state.includeArchived]
  );

  const productsQuery = useQuery({
    queryKey: ["products", filters],
    queryFn: () => api.products.list(filters)
  });

  const categories = productsQuery.data?.categories ?? [];
  const hasFilters =
    state.search.length > 0 ||
    state.category.length > 0 ||
    state.stockStatus !== "all" ||
    state.includeArchived;

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditing(product);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Catalogue"
        title="Products"
        description="Search the catalogue, inspect calculated stock and keep product metadata tidy."
        actions={
          isOwner ? (
            <Button onClick={openCreate}>
              <Plus className="size-4" aria-hidden="true" />
              New product
            </Button>
          ) : null
        }
      />

      <section className="rounded-xl border border-line bg-surface shadow-card">
        <div className="border-b border-line p-3.5 sm:p-4">
          <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400"
                aria-hidden="true"
              />
              <Input
                value={state.searchInput}
                onChange={(event) =>
                  setState((current) => ({ ...current, searchInput: event.target.value, page: 1 }))
                }
                placeholder="Search by product name or SKU…"
                aria-label="Search products by name or SKU"
                className="pl-9 pr-9"
              />
              {state.searchInput ? (
                <button
                  type="button"
                  onClick={() =>
                    setState((current) => ({ ...current, searchInput: "", search: "", page: 1 }))
                  }
                  className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded text-ink-400 hover:bg-ink-100 hover:text-ink-700"
                  aria-label="Clear search"
                >
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:flex">
              <Select
                ariaLabel="Filter by category"
                value={state.category || "all"}
                onValueChange={(value) =>
                  setState((current) => ({
                    ...current,
                    category: value === "all" ? "" : value,
                    page: 1
                  }))
                }
                options={[
                  { value: "all", label: "All categories" },
                  ...categories.map((category) => ({ value: category, label: category }))
                ]}
                className="min-w-36"
              />
              <Select
                ariaLabel="Filter by stock status"
                value={state.stockStatus}
                onValueChange={(value) =>
                  setState((current) => ({
                    ...current,
                    stockStatus: value as ProductsQueryState["stockStatus"],
                    page: 1
                  }))
                }
                options={[
                  { value: "all", label: "All stock" },
                  { value: "healthy", label: "Healthy" },
                  { value: "low", label: "Low stock" },
                  { value: "out", label: "Out of stock" }
                ]}
                className="min-w-32"
              />
              <div className="col-span-2 sm:col-span-1">
                <Select
                  ariaLabel="Sort products"
                  value={state.sort}
                  onValueChange={(value) =>
                    setState((current) => ({ ...current, sort: value, page: 1 }))
                  }
                  options={SORT_OPTIONS}
                  className="min-w-40"
                />
              </div>
            </div>
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] text-ink-400">
              <SlidersHorizontal className="size-3" aria-hidden="true" />
              {productsQuery.data
                ? `${formatNumber(productsQuery.data.pagination.total)} ${
                    productsQuery.data.pagination.total === 1 ? "product" : "products"
                  }`
                : "Loading products"}
            </span>
            {productsQuery.isFetching && !productsQuery.isPending ? (
              <span className="text-[11px] text-ink-400">Updating…</span>
            ) : null}
            {hasFilters ? (
              <button
                type="button"
                onClick={() => setState(INITIAL_STATE)}
                className="rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-brand-700 hover:bg-brand-50"
              >
                Clear filters
              </button>
            ) : null}
            {isOwner ? (
              <label className="ml-auto inline-flex cursor-pointer items-center gap-1.5 text-[11px] text-ink-500">
                <input
                  type="checkbox"
                  checked={state.includeArchived}
                  onChange={(event) =>
                    setState((current) => ({
                      ...current,
                      includeArchived: event.target.checked,
                      page: 1
                    }))
                  }
                  className="size-3.5 accent-brand-600"
                />
                Show archived
              </label>
            ) : null}
          </div>
        </div>

        {productsQuery.isPending ? (
          <div className="p-4">
            <TableSkeleton rows={8} columns={6} />
          </div>
        ) : productsQuery.isError ? (
          <ErrorState
            title="Products could not be loaded"
            message="Please check your connection and try again."
            onRetry={() => void productsQuery.refetch()}
          />
        ) : (productsQuery.data?.items.length ?? 0) === 0 ? (
          hasFilters ? (
            <EmptyState
              icon={PackageSearch}
              title="No products match those filters"
              description="Try a different search term, category or stock filter."
              action={
                <Button variant="outline" size="sm" onClick={() => setState(INITIAL_STATE)}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={Boxes}
              title="No products yet"
              description={
                isOwner
                  ? "Create your first product to start recording stock movements."
                  : "Your store owner has not added any products yet."
              }
              action={
                isOwner ? (
                  <Button size="sm" onClick={openCreate}>
                    <Plus className="size-3.5" aria-hidden="true" />
                    New product
                  </Button>
                ) : null
              }
            />
          )
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[860px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-line text-[10px] font-bold uppercase tracking-[0.12em] text-ink-400">
                    <th className="px-4 py-2.5 font-bold">Product</th>
                    <th className="px-4 py-2.5 font-bold">Category</th>
                    <th className="px-4 py-2.5 text-right font-bold">Price</th>
                    <th className="px-4 py-2.5 text-right font-bold">Stock</th>
                    <th className="px-4 py-2.5 font-bold">Status</th>
                    <th className="px-4 py-2.5 font-bold">Updated</th>
                    <th className="w-20 px-4 py-2.5">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/80">
                  {productsQuery.data?.items.map((product) => (
                    <tr key={product.id} className="transition-colors hover:bg-ink-50/40">
                      <td className="px-4 py-3">
                        <Link
                          to={`/products/${product.id}`}
                          className="group flex flex-col"
                        >
                          <span className="flex items-center gap-2 text-[13px] font-semibold text-ink-900 group-hover:text-brand-700">
                            {product.name}
                            {product.archivedAt ? (
                              <Badge tone="neutral" icon={<Archive className="size-3" aria-hidden="true" />}>
                                Archived
                              </Badge>
                            ) : null}
                          </span>
                          <span className="text-[11px] font-medium text-ink-400">{product.sku}</span>
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[12px] text-ink-600">{product.category}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-[12px] tabular-nums text-ink-700">
                        {formatCurrency(product.price)}
                      </td>
                      <td className="px-4 py-3 text-right text-[12px] tabular-nums text-ink-700">
                        {formatNumber(product.stock)}
                        <span className="ml-1 text-[10px] text-ink-400">{product.unit}</span>
                      </td>
                      <td className="px-4 py-3">
                        <StockBadge
                          stock={product.stock}
                          threshold={product.lowStockThreshold}
                        />
                      </td>
                      <td className="px-4 py-3 text-[11px] text-ink-400">
                        {formatDate(product.updatedAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {isOwner ? (
                            <button
                              type="button"
                              onClick={() => openEdit(product)}
                              className="grid size-7 place-items-center rounded-md text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-800"
                              aria-label={`Edit ${product.name}`}
                            >
                              <Pencil className="size-3.5" aria-hidden="true" />
                            </button>
                          ) : null}
                          <Link
                            to={`/products/${product.id}`}
                            className="grid size-7 place-items-center rounded-md text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-800"
                            aria-label={`View ${product.name} details`}
                          >
                            <ChevronRight className="size-4" aria-hidden="true" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-line lg:hidden">
              {productsQuery.data?.items.map((product) => (
                <li key={product.id} className="px-4 py-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        to={`/products/${product.id}`}
                        className="block truncate text-[13px] font-semibold text-ink-900"
                      >
                        {product.name}
                      </Link>
                      <p className="mt-0.5 text-[11px] text-ink-400">
                        {product.sku} · {product.category}
                      </p>
                    </div>
                    {isOwner ? (
                      <button
                        type="button"
                        onClick={() => openEdit(product)}
                        className="grid size-8 shrink-0 place-items-center rounded-md border border-line text-ink-500"
                        aria-label={`Edit ${product.name}`}
                      >
                        <Pencil className="size-3.5" aria-hidden="true" />
                      </button>
                    ) : null}
                  </div>
                  <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "text-[15px] font-bold tabular-nums",
                          product.stock <= 0
                            ? "text-red-600"
                            : product.stock <= product.lowStockThreshold
                              ? "text-amber-700"
                              : "text-ink-900"
                        )}
                      >
                        {formatNumber(product.stock)}
                        <span className="ml-1 text-[10px] font-medium text-ink-400">
                          {product.unit} on hand
                        </span>
                      </span>
                      <StockBadge stock={product.stock} threshold={product.lowStockThreshold} />
                    </div>
                    <span className="text-[11px] tabular-nums text-ink-500">
                      {formatCurrency(product.price)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>

            {productsQuery.data ? (
              <Pagination
                pagination={productsQuery.data.pagination}
                onPageChange={(page) => setState((current) => ({ ...current, page }))}
                itemLabel="products"
              />
            ) : null}
          </>
        )}
      </section>

      <ProductFormDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditing(null);
        }}
        product={editing}
        categories={categories}
      />
    </div>
  );
}
