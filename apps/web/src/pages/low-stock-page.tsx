import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CircleCheck, RefreshCw, TriangleAlert } from "lucide-react";
import { api } from "../lib/api";
import { formatNumber, stockState } from "../lib/utils";
import { PageHeader } from "../components/page-header";
import { Button } from "../components/ui/button";
import { StockBadge } from "../components/ui/badge";
import { TableSkeleton } from "../components/ui/skeleton";
import { EmptyState, ErrorState } from "../components/ui/states";

export function LowStockPage() {
  const reportQuery = useQuery({
    queryKey: ["reports", "low-stock"],
    queryFn: api.reports.lowStock
  });

  const items = reportQuery.data?.items ?? [];
  const outOfStock = items.filter((item) => item.status === "OUT").length;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Owner report"
        title="Low stock"
        description="Products at or below their configured threshold, calculated from the movement ledger."
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => void reportQuery.refetch()}
              aria-label="Refresh low-stock report"
            >
              <RefreshCw className="size-3.5" aria-hidden="true" />
              Refresh
            </Button>
            <Link
              to="/reports"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-ink-900 px-4 text-[13px] font-semibold text-white transition-colors hover:bg-ink-800"
            >
              Reports & export
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          </>
        }
      />

      <section className="rounded-xl border border-line bg-surface shadow-card">
        {reportQuery.isPending ? (
          <div className="p-4">
            <TableSkeleton rows={6} columns={5} />
          </div>
        ) : reportQuery.isError ? (
          <ErrorState
            title="Report unavailable"
            message="The low-stock report could not be loaded. Please try again."
            onRetry={() => void reportQuery.refetch()}
          />
        ) : items.length === 0 ? (
          <EmptyState
            icon={CircleCheck}
            title="All stocked up"
            description="No product is at or below its low-stock threshold. Keep an eye on the ledger as sales come in."
            action={
              <Link
                to="/products"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-xs font-semibold text-ink-700 hover:bg-ink-50"
              >
                Browse products
              </Link>
            }
          />
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3.5 sm:px-5">
              <div className="flex items-center gap-2 text-[12px] font-medium text-ink-600">
                <span className="grid size-7 place-items-center rounded-lg bg-amber-50 text-amber-700">
                  <TriangleAlert className="size-3.5" aria-hidden="true" />
                </span>
                <span>
                  <strong className="font-semibold text-ink-900">{items.length}</strong>{" "}
                  {items.length === 1 ? "product needs" : "products need"} attention
                </span>
              </div>
              <span className="text-[11px] text-ink-400">
                {outOfStock} out of stock · threshold includes equal stock
              </span>
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[720px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-line text-[10px] font-bold uppercase tracking-[0.12em] text-ink-400">
                    <th className="px-4 py-2.5 font-bold">Product</th>
                    <th className="px-4 py-2.5 font-bold">Category</th>
                    <th className="px-4 py-2.5 text-right font-bold">Stock</th>
                    <th className="px-4 py-2.5 text-right font-bold">Threshold</th>
                    <th className="px-4 py-2.5 text-right font-bold">Difference</th>
                    <th className="px-4 py-2.5 font-bold">Status</th>
                    <th className="w-16 px-4 py-2.5">
                      <span className="sr-only">Open</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/80">
                  {items.map((item) => {
                    const state = stockState(item.stock, item.lowStockThreshold);
                    return (
                      <tr key={item.id} className="transition-colors hover:bg-ink-50/40">
                        <td className="px-4 py-3">
                          <Link
                            to={`/products/${item.id}`}
                            className="text-[13px] font-semibold text-ink-900 hover:text-brand-700"
                          >
                            {item.name}
                          </Link>
                          <p className="text-[11px] text-ink-400">{item.sku}</p>
                        </td>
                        <td className="px-4 py-3 text-[12px] text-ink-600">{item.category}</td>
                        <td className="px-4 py-3 text-right text-[13px] font-semibold tabular-nums text-ink-900">
                          {formatNumber(item.stock)}
                          <span className="ml-1 text-[10px] font-normal text-ink-400">
                            {item.unit}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-[12px] tabular-nums text-ink-500">
                          {formatNumber(item.lowStockThreshold)}
                        </td>
                        <td className="px-4 py-3 text-right text-[12px] font-semibold tabular-nums text-amber-700">
                          −{formatNumber(item.deficit)}
                        </td>
                        <td className="px-4 py-3">
                          <StockBadge stock={item.stock} threshold={item.lowStockThreshold} />
                          <span className="sr-only">{state.label}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            to={`/products/${item.id}`}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-700 hover:text-brand-800"
                          >
                            View
                            <ArrowRight className="size-3" aria-hidden="true" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-line md:hidden">
              {items.map((item) => (
                <li key={item.id} className="px-4 py-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        to={`/products/${item.id}`}
                        className="block truncate text-[13px] font-semibold text-ink-900"
                      >
                        {item.name}
                      </Link>
                      <p className="mt-0.5 text-[11px] text-ink-400">
                        {item.sku} · {item.category}
                      </p>
                    </div>
                    <StockBadge stock={item.stock} threshold={item.lowStockThreshold} />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-ink-500">
                    <span>
                      <strong className="font-semibold text-ink-900">{item.stock}</strong>{" "}
                      {item.unit} on hand · threshold {item.lowStockThreshold}
                    </span>
                    <span className="font-semibold text-amber-700">
                      {item.deficit} below
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <p className="rounded-xl border border-line bg-surface/60 px-4 py-3 text-[11px] leading-relaxed text-ink-400">
        A product is included when its calculated stock is less than or equal to its threshold,
        including zero. Stock comes from the signed sum of all recorded movements.
      </p>
    </div>
  );
}
