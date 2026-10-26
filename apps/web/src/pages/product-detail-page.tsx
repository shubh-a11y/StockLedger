import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  ArrowLeft,
  Boxes,
  CalendarDays,
  History,
  Pencil,
  PackagePlus,
  Ruler,
  Tag
} from "lucide-react";
import { api, ApiRequestError } from "../lib/api";
import { useAuth } from "../hooks/use-auth";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
  MOVEMENT_META,
  MOVEMENT_TYPES,
  stockState
} from "../lib/utils";
import type { MovementType } from "../types";
import { PageHeader } from "../components/page-header";
import { Button } from "../components/ui/button";
import { Select } from "../components/ui/select";
import { Badge, StockBadge } from "../components/ui/badge";
import { Skeleton, TableSkeleton } from "../components/ui/skeleton";
import { EmptyState, ErrorState } from "../components/ui/states";
import { Pagination } from "../components/ui/pagination";
import { Modal } from "../components/ui/dialog";
import { useToast } from "../components/ui/toast";
import { MovementDialog } from "../components/movements/movement-dialog";
import { MovementTable } from "../components/movements/movement-table";
import { ProductFormDialog } from "../components/products/product-form-dialog";

function InfoTile({
  label,
  value,
  hint,
  icon: Icon
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon: typeof Tag;
}) {
  return (
    <div className="rounded-lg border border-line bg-ink-50/40 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-ink-400">
        <Icon className="size-3" aria-hidden="true" />
        {label}
      </div>
      <div className="mt-1.5 text-[13px] font-semibold text-ink-900">{value}</div>
      {hint ? <p className="mt-0.5 text-[10px] text-ink-400">{hint}</p> : null}
    </div>
  );
}

export function ProductDetailPage() {
  const { id = "" } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [movementOpen, setMovementOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [movementPage, setMovementPage] = useState(1);
  const [movementType, setMovementType] = useState<MovementType | "all">("all");

  const productQuery = useQuery({
    queryKey: ["product", id],
    queryFn: () => api.products.get(id),
    enabled: Boolean(id)
  });

  const movementsQuery = useQuery({
    queryKey: ["movements", "product", id, movementPage, movementType],
    queryFn: () =>
      api.movements.listForProduct(id, {
        page: movementPage,
        pageSize: 10,
        type: movementType
      }),
    enabled: Boolean(id)
  });

  const archiveMutation = useMutation({
    mutationFn: () => api.products.archive(id),
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["products"] }),
        queryClient.invalidateQueries({ queryKey: ["product", id] }),
        queryClient.invalidateQueries({ queryKey: ["reports"] })
      ]);
      setArchiveOpen(false);
      toast({
        title: "Product archived",
        description: `${result.product.name} is hidden from active inventory. Its movement history is preserved.`,
        variant: "success"
      });
    },
    onError: (error) => {
      toast({
        title: "Could not archive product",
        description:
          error instanceof ApiRequestError ? error.message : "Please try again in a moment.",
        variant: "error"
      });
    }
  });

  if (productQuery.isPending) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-16 w-full max-w-xl" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-40 lg:col-span-2" />
          <Skeleton className="h-40" />
        </div>
      </div>
    );
  }

  if (productQuery.isError) {
    const notFound =
      productQuery.error instanceof ApiRequestError && productQuery.error.status === 404;
    return (
      <div className="rounded-xl border border-line bg-surface shadow-card">
        <ErrorState
          title={notFound ? "Product not found" : "Product could not be loaded"}
          message={
            notFound
              ? "It may have been removed or archived. Return to the catalogue to keep browsing."
              : "Check your connection and try again."
          }
          onRetry={notFound ? undefined : () => void productQuery.refetch()}
        />
        <div className="border-t border-line px-4 py-3 text-center">
          <Link
            to="/products"
            className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-brand-700 hover:text-brand-800"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            Back to products
          </Link>
        </div>
      </div>
    );
  }

  const product = productQuery.data.product;
  const state = stockState(product.stock, product.lowStockThreshold);
  const movements = movementsQuery.data?.items ?? [];

  return (
    <div className="space-y-5">
      <Link
        to="/products"
        className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-ink-500 transition-colors hover:text-ink-900"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        All products
      </Link>

      <PageHeader
        eyebrow={`${product.category} · ${product.sku}`}
        title={product.name}
        description="Product metadata and the complete ledger history behind its stock balance."
        actions={
          <>
            {product.archivedAt ? (
              <Badge tone="neutral" icon={<Archive className="size-3" aria-hidden="true" />}>
                Archived
              </Badge>
            ) : null}
            {user?.role === "OWNER" ? (
              <Button variant="outline" onClick={() => setEditOpen(true)}>
                <Pencil className="size-3.5" aria-hidden="true" />
                Edit product
              </Button>
            ) : null}
            <Button onClick={() => setMovementOpen(true)} disabled={Boolean(product.archivedAt)}>
              <PackagePlus className="size-4" aria-hidden="true" />
              Record movement
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-xl border border-line bg-surface p-4 shadow-card sm:p-5 lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-400">
                Current stock
              </p>
              <div className="mt-1.5 flex items-end gap-2">
                <span
                  className={
                    state.tone === "out"
                      ? "font-display text-[40px] font-bold leading-none tabular-nums text-red-600"
                      : state.tone === "low"
                        ? "font-display text-[40px] font-bold leading-none tabular-nums text-amber-700"
                        : "font-display text-[40px] font-bold leading-none tabular-nums text-ink-900"
                  }
                >
                  {formatNumber(product.stock)}
                </span>
                <span className="pb-1 text-[12px] font-medium text-ink-400">{product.unit}</span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <StockBadge stock={product.stock} threshold={product.lowStockThreshold} />
                <span className="text-[11px] text-ink-400">
                  {movementsQuery.data
                    ? `${formatNumber(movementsQuery.data.pagination.total)} movements in the ledger`
                    : "Loading history…"}
                </span>
              </div>
            </div>

            <div className="rounded-lg border border-line bg-ink-50/50 px-3 py-2 text-right">
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-400">
                Low-stock threshold
              </p>
              <p className="mt-1 font-display text-lg font-bold tabular-nums text-ink-900">
                {formatNumber(product.lowStockThreshold)}
              </p>
              <p className="text-[10px] text-ink-400">
                {product.stock <= product.lowStockThreshold
                  ? `${formatNumber(Math.max(0, product.lowStockThreshold - product.stock))} below threshold`
                  : `${formatNumber(product.stock - product.lowStockThreshold)} above threshold`}
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <InfoTile label="Price" value={formatCurrency(product.price)} icon={Tag} />
            <InfoTile label="Unit" value={product.unit} icon={Ruler} />
            <InfoTile label="Added" value={formatDate(product.createdAt)} icon={CalendarDays} />
            <InfoTile label="Updated" value={formatDate(product.updatedAt)} icon={CalendarDays} />
          </div>
        </section>

        <section className="rounded-xl border border-line bg-surface p-4 shadow-card sm:p-5">
          <h2 className="font-display text-[14px] font-bold text-ink-900">Ledger integrity</h2>
          <p className="mt-1 text-[11px] leading-relaxed text-ink-500">
            Stock is the sum of signed movement quantities. It cannot be edited directly.
          </p>
          <dl className="mt-4 space-y-2.5">
            <div className="flex items-center justify-between gap-3 border-b border-line pb-2.5">
              <dt className="text-[11px] text-ink-500">Incoming</dt>
              <dd className="text-[12px] font-semibold text-emerald-700">Purchases, returns, +adj</dd>
            </div>
            <div className="flex items-center justify-between gap-3 border-b border-line pb-2.5">
              <dt className="text-[11px] text-ink-500">Outgoing</dt>
              <dd className="text-[12px] font-semibold text-brand-700">Sales, −adjustments</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-[11px] text-ink-500">Corrections</dt>
              <dd className="text-[12px] font-semibold text-ink-800">
                Compensating movements only
              </dd>
            </div>
          </dl>

          {user?.role === "OWNER" && !product.archivedAt ? (
            <div className="mt-4 border-t border-line pt-3.5">
              <button
                type="button"
                onClick={() => setArchiveOpen(true)}
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-ink-500 transition-colors hover:text-red-700"
              >
                <Archive className="size-3.5" aria-hidden="true" />
                Archive product
              </button>
              <p className="mt-1 text-[10px] leading-relaxed text-ink-400">
                Archiving hides the product from active inventory while keeping its history intact.
              </p>
            </div>
          ) : null}

          {product.archivedAt ? (
            <p className="mt-4 rounded-lg border border-ink-200 bg-ink-50 px-3 py-2 text-[11px] text-ink-500">
              This product is archived. Its ledger remains available for audit.
            </p>
          ) : null}
        </section>
      </div>

      <section className="rounded-xl border border-line bg-surface shadow-card">
        <div className="flex flex-col gap-3 border-b border-line px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h2 className="font-display text-[14px] font-bold text-ink-900">Movement history</h2>
            <p className="mt-0.5 text-[11px] text-ink-400">
              Every change to this product's stock, newest first.
            </p>
          </div>
          <Select
            ariaLabel="Filter movement history by type"
            value={movementType}
            onValueChange={(value) => {
              setMovementType(value as MovementType | "all");
              setMovementPage(1);
            }}
            options={[
              { value: "all", label: "All movement types" },
              ...MOVEMENT_TYPES.map((type) => ({ value: type, label: MOVEMENT_META[type].label }))
            ]}
            className="w-full sm:w-52"
          />
        </div>

        {movementsQuery.isPending ? (
          <div className="p-4">
            <TableSkeleton rows={5} columns={5} />
          </div>
        ) : movementsQuery.isError ? (
          <ErrorState
            title="History could not be loaded"
            message="Try refreshing the page or check the API connection."
            onRetry={() => void movementsQuery.refetch()}
          />
        ) : movements.length === 0 ? (
          <EmptyState
            icon={History}
            title={movementType === "all" ? "No movements recorded" : "No movements of this type"}
            description={
              movementType === "all"
                ? "This product has no ledger entries yet, so its stock is zero. Record a purchase to add opening stock."
                : "Try a different movement type filter."
            }
            action={
              movementType === "all" ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMovementOpen(true)}
                  disabled={Boolean(product.archivedAt)}
                >
                  <PackagePlus className="size-3.5" aria-hidden="true" />
                  Record opening stock
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMovementType("all")}
                >
                  Clear filter
                </Button>
              )
            }
          />
        ) : (
          <>
            <MovementTable movements={movements} showProduct={false} />
            {movementsQuery.data ? (
              <Pagination
                pagination={movementsQuery.data.pagination}
                onPageChange={setMovementPage}
                itemLabel="movements"
              />
            ) : null}
          </>
        )}
      </section>

      <div className="rounded-xl border border-line bg-surface/60 px-4 py-3 text-[11px] leading-relaxed text-ink-400">
        Need to correct a mistake? Record an adjustment instead of editing history. The original
        movement stays in the audit trail. Last recorded movement:{" "}
        {movements[0] ? formatDateTime(movements[0].occurredAt) : "none"}.
      </div>

      {user ? (
        <>
          <MovementDialog
            open={movementOpen}
            onOpenChange={setMovementOpen}
            role={user.role}
            defaultProductId={product.id}
            defaultKind="sale"
          />
          <ProductFormDialog
            open={editOpen}
            onOpenChange={setEditOpen}
            product={product}
            categories={[product.category]}
          />
        </>
      ) : null}

      <Modal
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title="Archive this product?"
        description="The product disappears from active inventory, search and reports. Its movement ledger is not deleted."
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setArchiveOpen(false)}>
              Keep active
            </Button>
            <Button
              variant="danger"
              loading={archiveMutation.isPending}
              onClick={() => archiveMutation.mutate()}
            >
              Archive product
            </Button>
          </>
        }
      >
        <div className="flex items-start gap-3 rounded-lg border border-line bg-ink-50/60 p-3">
          <Boxes className="mt-0.5 size-4 shrink-0 text-ink-400" aria-hidden="true" />
          <div className="text-[12px] leading-relaxed text-ink-600">
            <p className="font-semibold text-ink-900">{product.name}</p>
            <p className="mt-0.5">
              {formatNumber(product.stock)} {product.unit} on hand · {product.sku}
            </p>
            <p className="mt-1.5 text-[11px] text-ink-500">
              Movement history will remain queryable by owners for audit and reporting.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
