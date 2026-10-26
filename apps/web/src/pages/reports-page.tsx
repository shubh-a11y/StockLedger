import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Download,
  FileSpreadsheet,
  Info,
  ShieldCheck,
  TriangleAlert
} from "lucide-react";
import { api, ApiRequestError } from "../lib/api";
import { formatNumber } from "../lib/utils";
import { PageHeader } from "../components/page-header";
import { Button } from "../components/ui/button";
import { Badge, StockBadge } from "../components/ui/badge";
import { Skeleton } from "../components/ui/skeleton";
import { EmptyState, ErrorState } from "../components/ui/states";
import { useToast } from "../components/ui/toast";

export function ReportsPage() {
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);

  const dashboardQuery = useQuery({
    queryKey: ["reports", "dashboard"],
    queryFn: api.reports.dashboard
  });
  const lowStockQuery = useQuery({
    queryKey: ["reports", "low-stock"],
    queryFn: api.reports.lowStock
  });

  const handleExport = async () => {
    setExporting(true);
    try {
      await api.reports.downloadCsv();
      toast({
        title: "Export downloaded",
        description: "Your stock snapshot CSV is ready, with spreadsheet formulas neutralised.",
        variant: "success"
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description:
          error instanceof ApiRequestError
            ? error.message
            : "We could not generate the export. Please try again.",
        variant: "error"
      });
    } finally {
      setExporting(false);
    }
  };

  const totals = dashboardQuery.data?.totals;
  const lowStock = lowStockQuery.data?.items ?? [];

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Owner workspace"
        title="Reports & export"
        description="Inventory snapshots and low-stock reporting for owners. Every figure comes from the movement ledger."
        actions={<Badge tone="brand" icon={<ShieldCheck className="size-3" aria-hidden="true" />}>Owner only</Badge>}
      />

      {dashboardQuery.isError ? (
        <div className="rounded-xl border border-line bg-surface shadow-card">
          <ErrorState
            title="Reports unavailable"
            message="We could not load inventory reporting data."
            onRetry={() => {
              void dashboardQuery.refetch();
              void lowStockQuery.refetch();
            }}
          />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <section className="rounded-xl border border-line bg-surface p-4 shadow-card sm:p-5 lg:col-span-2">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-brand-100 bg-brand-50 text-brand-700">
                <FileSpreadsheet className="size-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="font-display text-[15px] font-bold text-ink-900">
                  Stock snapshot CSV
                </h2>
                <p className="mt-1 max-w-xl text-[12px] leading-relaxed text-ink-500">
                  Export every active product with its calculated stock, threshold and status.
                  Figures match the dashboard and product pages because they use the same ledger
                  calculation.
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <div className="rounded-lg border border-line bg-ink-50/40 p-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-400">
                  Columns
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-ink-600">
                  SKU, name, category, unit, price, current stock, low-stock threshold, status
                </p>
              </div>
              <div className="rounded-lg border border-line bg-ink-50/40 p-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-400">
                  Safe by design
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-ink-600">
                  Escaped cells, formula-injection protection and paged generation for large
                  catalogues
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button onClick={() => void handleExport()} loading={exporting}>
                <Download className="size-4" aria-hidden="true" />
                {exporting ? "Preparing export…" : "Download CSV"}
              </Button>
              <p className="text-[11px] text-ink-400">
                Owner authorization is enforced by the API, not just this page.
              </p>
            </div>
          </section>

          <section className="rounded-xl border border-line bg-surface p-4 shadow-card sm:p-5">
            <h2 className="font-display text-[14px] font-bold text-ink-900">Inventory health</h2>
            {dashboardQuery.isPending || !totals ? (
              <div className="mt-4 space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <dl className="mt-3 space-y-2.5">
                {[
                  { label: "Active products", value: totals.totalProducts },
                  { label: "Units on hand", value: totals.totalUnits },
                  { label: "Low-stock products", value: totals.lowStockCount },
                  { label: "Out of stock", value: totals.outOfStockCount }
                ].map((metric) => (
                  <div
                    key={metric.label}
                    className="flex items-center justify-between gap-3 border-b border-line pb-2.5 last:border-0 last:pb-0"
                  >
                    <dt className="text-[12px] text-ink-500">{metric.label}</dt>
                    <dd className="text-[14px] font-bold tabular-nums text-ink-900">
                      {formatNumber(metric.value)}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </section>
        </div>
      )}

      <section className="rounded-xl border border-line bg-surface shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3.5 sm:px-5">
          <div className="flex items-center gap-2">
            <TriangleAlert className="size-4 text-amber-600" aria-hidden="true" />
            <h2 className="font-display text-[14px] font-bold text-ink-900">
              Low-stock preview
            </h2>
          </div>
          <Link
            to="/low-stock"
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-700 hover:text-brand-800"
          >
            Full report
            <ArrowRight className="size-3" aria-hidden="true" />
          </Link>
        </div>

        {lowStockQuery.isPending ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : lowStockQuery.isError ? (
          <ErrorState
            title="Low-stock data unavailable"
            message="Try refreshing the report."
            onRetry={() => void lowStockQuery.refetch()}
          />
        ) : lowStock.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="No products need attention"
            description="Every active product is above its low-stock threshold."
            className="py-10"
          />
        ) : (
          <ul className="divide-y divide-line/80">
            {lowStock.slice(0, 8).map((item) => (
              <li key={item.id}>
                <Link
                  to={`/products/${item.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-2.5 transition-colors hover:bg-ink-50/50 sm:px-5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-semibold text-ink-900">{item.name}</p>
                    <p className="text-[10px] text-ink-400">
                      {item.sku} · {item.stock} on hand · threshold {item.lowStockThreshold}
                    </p>
                  </div>
                  <StockBadge stock={item.stock} threshold={item.lowStockThreshold} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex items-start gap-2.5 rounded-xl border border-line bg-surface/60 px-4 py-3 text-[11px] leading-relaxed text-ink-500">
        <Info className="mt-0.5 size-3.5 shrink-0 text-ink-400" aria-hidden="true" />
        <p>
          Large inventories are exported in pages of 100 products and streamed to the response, so
          memory use stays bounded. Exports exclude archived products and include zero-stock items.
        </p>
      </div>
    </div>
  );
}
