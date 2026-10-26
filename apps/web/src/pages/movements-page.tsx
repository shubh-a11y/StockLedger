import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { History, PackagePlus, Search, X } from "lucide-react";
import type { MovementQuery, MovementType } from "../types";
import { api } from "../lib/api";
import { useAuth } from "../hooks/use-auth";
import { formatNumber, MOVEMENT_META, MOVEMENT_TYPES } from "../lib/utils";
import { PageHeader } from "../components/page-header";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Select } from "../components/ui/select";
import { TableSkeleton } from "../components/ui/skeleton";
import { EmptyState, ErrorState } from "../components/ui/states";
import { Pagination } from "../components/ui/pagination";
import { MovementTable } from "../components/movements/movement-table";
import { MovementDialog } from "../components/movements/movement-dialog";

interface LedgerFilters {
  page: number;
  search: string;
  searchInput: string;
  type: MovementType | "all";
  productId: string;
  from: string;
  to: string;
}

const INITIAL: LedgerFilters = {
  page: 1,
  search: "",
  searchInput: "",
  type: "all",
  productId: "",
  from: "",
  to: ""
};

function toIso(value: string, endOfDay = false): string | undefined {
  if (!value) return undefined;
  const date = new Date(`${value}T${endOfDay ? "23:59:59" : "00:00:00"}`);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export function MovementsPage() {
  const { user } = useAuth();
  const [filters, setFilters] = useState<LedgerFilters>(INITIAL);
  const [dialogOpen, setDialogOpen] = useState(false);

  const productsQuery = useQuery({
    queryKey: ["products", "ledger-filter"],
    queryFn: () => api.products.list({ pageSize: 100, sort: "name", order: "asc" }),
    staleTime: 30_000
  });

  const query: MovementQuery = useMemo(
    () => ({
      page: filters.page,
      pageSize: 15,
      type: filters.type,
      productId: filters.productId || undefined,
      search: filters.search || undefined,
      from: toIso(filters.from),
      to: toIso(filters.to, true),
      sort: "occurredAt",
      order: "desc"
    }),
    [filters]
  );

  const movementsQuery = useQuery({
    queryKey: ["movements", "ledger", query],
    queryFn: () => api.movements.list(query)
  });

  const hasFilters =
    filters.search.length > 0 ||
    filters.type !== "all" ||
    filters.productId.length > 0 ||
    filters.from.length > 0 ||
    filters.to.length > 0;

  const products = productsQuery.data?.items ?? [];

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Audit trail"
        title="Movement ledger"
        description="Every stock change in one immutable ledger — who moved what, when, and why."
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <PackagePlus className="size-4" aria-hidden="true" />
            Record movement
          </Button>
        }
      />

      <section className="rounded-xl border border-line bg-surface shadow-card">
        <div className="space-y-2.5 border-b border-line p-3.5 sm:p-4">
          <div className="flex flex-col gap-2.5 lg:flex-row">
            <div className="relative min-w-0 flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400"
                aria-hidden="true"
              />
              <Input
                value={filters.searchInput}
                onChange={(event) => {
                  const value = event.target.value;
                  setFilters((current) => ({ ...current, searchInput: value, search: value, page: 1 }));
                }}
                placeholder="Search reason, reference, product or SKU…"
                aria-label="Search movement ledger"
                className="pl-9 pr-9"
              />
              {filters.searchInput ? (
                <button
                  type="button"
                  onClick={() =>
                    setFilters((current) => ({ ...current, searchInput: "", search: "", page: 1 }))
                  }
                  className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded text-ink-400 hover:bg-ink-100 hover:text-ink-700"
                  aria-label="Clear search"
                >
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 lg:flex">
              <Select
                ariaLabel="Filter by movement type"
                value={filters.type}
                onValueChange={(value) =>
                  setFilters((current) => ({
                    ...current,
                    type: value as MovementType | "all",
                    page: 1
                  }))
                }
                options={[
                  { value: "all", label: "All types" },
                  ...MOVEMENT_TYPES.map((type) => ({ value: type, label: MOVEMENT_META[type].label }))
                ]}
                className="min-w-40"
              />
              <Select
                ariaLabel="Filter by product"
                value={filters.productId || "all"}
                onValueChange={(value) =>
                  setFilters((current) => ({
                    ...current,
                    productId: value === "all" ? "" : value,
                    page: 1
                  }))
                }
                options={[
                  { value: "all", label: "All products" },
                  ...products.map((product) => ({
                    value: product.id,
                    label: `${product.name} · ${product.sku}`
                  }))
                ]}
                className="min-w-44"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <div className="flex items-center gap-1.5">
              <label htmlFor="from-date" className="text-[11px] font-medium text-ink-500">
                From
              </label>
              <Input
                id="from-date"
                type="date"
                value={filters.from}
                max={filters.to || undefined}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, from: event.target.value, page: 1 }))
                }
                className="h-8 w-36 text-[11px]"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <label htmlFor="to-date" className="text-[11px] font-medium text-ink-500">
                To
              </label>
              <Input
                id="to-date"
                type="date"
                value={filters.to}
                min={filters.from || undefined}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, to: event.target.value, page: 1 }))
                }
                className="h-8 w-36 text-[11px]"
              />
            </div>
            {hasFilters ? (
              <button
                type="button"
                onClick={() => setFilters(INITIAL)}
                className="rounded-md px-1.5 py-1 text-[11px] font-semibold text-brand-700 hover:bg-brand-50"
              >
                Clear filters
              </button>
            ) : null}
            <span className="ml-auto text-[11px] text-ink-400">
              {movementsQuery.data
                ? `${formatNumber(movementsQuery.data.pagination.total)} ledger entries`
                : "Loading ledger"}
              {movementsQuery.isFetching && !movementsQuery.isPending ? " · updating…" : ""}
            </span>
          </div>
        </div>

        {movementsQuery.isPending ? (
          <div className="p-4">
            <TableSkeleton rows={9} columns={6} />
          </div>
        ) : movementsQuery.isError ? (
          <ErrorState
            title="Ledger unavailable"
            message="We could not load stock movements. Please try again."
            onRetry={() => void movementsQuery.refetch()}
          />
        ) : (movementsQuery.data?.items.length ?? 0) === 0 ? (
          hasFilters ? (
            <EmptyState
              icon={Search}
              title="No movements match those filters"
              description="Try widening the date range, clearing the product filter or searching a different term."
              action={
                <Button variant="outline" size="sm" onClick={() => setFilters(INITIAL)}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={History}
              title="The ledger is empty"
              description="Record a purchase, sale, return or adjustment and it will appear here with its actor and timestamp."
              action={
                <Button size="sm" onClick={() => setDialogOpen(true)}>
                  <PackagePlus className="size-3.5" aria-hidden="true" />
                  Record movement
                </Button>
              }
            />
          )
        ) : (
          <>
            <MovementTable movements={movementsQuery.data?.items ?? []} />
            {movementsQuery.data ? (
              <Pagination
                pagination={movementsQuery.data.pagination}
                onPageChange={(page) => setFilters((current) => ({ ...current, page }))}
                itemLabel="movements"
              />
            ) : null}
          </>
        )}
      </section>

      {user ? (
        <MovementDialog open={dialogOpen} onOpenChange={setDialogOpen} role={user.role} />
      ) : null}
    </div>
  );
}
