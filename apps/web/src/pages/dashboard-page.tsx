import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps
} from "recharts";
import {
  ArrowRight,
  Boxes,
  CircleAlert,
  History,
  Layers,
  PackagePlus,
  Plus,
  RefreshCw,
  TriangleAlert
} from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../hooks/use-auth";
import {
  cn,
  formatDay,
  formatNumber,
  MOVEMENT_META,
  relativeTime
} from "../lib/utils";
import { PageHeader } from "../components/page-header";
import { Button } from "../components/ui/button";
import { StockBadge } from "../components/ui/badge";
import { CardSkeleton, Skeleton, TableSkeleton } from "../components/ui/skeleton";
import { EmptyState, ErrorState } from "../components/ui/states";
import { MovementDialog } from "../components/movements/movement-dialog";
import { MovementQuantity } from "../components/movements/movement-table";
import { ProductFormDialog } from "../components/products/product-form-dialog";
import { queryClient } from "../lib/query-client";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

interface MetricProps {
  label: string;
  value: number | undefined;
  hint: string;
  icon: typeof Boxes;
  tone?: "default" | "warn" | "danger";
  loading: boolean;
}

function MetricCard({ label, value, hint, icon: Icon, tone = "default", loading }: MetricProps) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4 shadow-card sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-400">{label}</p>
        <span
          className={cn(
            "grid size-7 place-items-center rounded-lg",
            tone === "warn"
              ? "bg-amber-50 text-amber-700"
              : tone === "danger"
                ? "bg-red-50 text-red-600"
                : "bg-ink-50 text-ink-500"
          )}
        >
          <Icon className="size-3.5" aria-hidden="true" />
        </span>
      </div>
      {loading || value === undefined ? (
        <>
          <Skeleton className="mt-4 h-8 w-20" />
          <Skeleton className="mt-3 h-3 w-28" />
        </>
      ) : (
        <>
          <p className="mt-3 font-display text-[28px] font-bold leading-none tabular-nums text-ink-900">
            {formatNumber(value)}
          </p>
          <p className="mt-2 text-[11px] leading-relaxed text-ink-400">{hint}</p>
        </>
      )}
    </div>
  );
}

function ChartTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload as { day: string; incoming: number; outgoing: number };
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 shadow-lift">
      <p className="text-[10px] font-bold uppercase tracking-wider text-ink-400">
        {formatDay(point.day)}
      </p>
      <p className="mt-1 text-[11px] text-emerald-700">
        <span className="font-semibold tabular-nums">+{point.incoming}</span> received
      </p>
      <p className="text-[11px] text-brand-700">
        <span className="font-semibold tabular-nums">−{point.outgoing}</span> removed
      </p>
    </div>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const reduceMotion = useReducedMotion();
  const [movementOpen, setMovementOpen] = useState(false);
  const [productOpen, setProductOpen] = useState(false);

  const dashboardQuery = useQuery({
    queryKey: ["reports", "dashboard"],
    queryFn: api.reports.dashboard
  });

  const data = dashboardQuery.data;
  const isEmptyInventory = data !== undefined && data.totals.totalProducts === 0;
  const hasActivity =
    data?.activity.some((point) => point.incoming > 0 || point.outgoing > 0) ?? false;

  if (dashboardQuery.isError) {
    return (
      <div className="rounded-xl border border-line bg-surface shadow-card">
        <ErrorState
          title="Dashboard unavailable"
          message="We could not load your inventory overview. Check that the API is running and try again."
          onRetry={() => void dashboardQuery.refetch()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Inventory overview"
        title={`${greeting()}, ${user?.name.split(" ")[0] ?? "there"}.`}
        description="A live read of your shop's stock, straight from the movement ledger."
        actions={
          <>
            <Button
              variant="outline"
              size="md"
              onClick={() => void queryClient.invalidateQueries({ queryKey: ["reports"] })}
              aria-label="Refresh dashboard data"
            >
              <RefreshCw className="size-3.5" aria-hidden="true" />
              Refresh
            </Button>
            <Button size="md" onClick={() => setMovementOpen(true)}>
              <PackagePlus className="size-4" aria-hidden="true" />
              Record movement
            </Button>
          </>
        }
      />

      {isEmptyInventory ? (
        <div className="rounded-xl border border-dashed border-ink-200 bg-surface">
          <EmptyState
            icon={Boxes}
            title="Your ledger is ready for its first product"
            description="Create a product to start recording purchases, sales and returns. Opening stock arrives through a purchase movement — there is no stock field to edit."
            action={
              user?.role === "OWNER" ? (
                <Button onClick={() => setProductOpen(true)}>
                  <Plus className="size-4" aria-hidden="true" />
                  Create your first product
                </Button>
              ) : (
                <p className="text-xs text-ink-500">Ask your store owner to add the first product.</p>
              )
            }
          />
        </div>
      ) : (
        <>
          <motion.section
            className="grid grid-cols-2 gap-3 lg:grid-cols-4"
            initial={reduceMotion ? false : "hidden"}
            animate="visible"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.05 } }
            }}
            aria-label="Inventory summary"
          >
            {[
              {
                label: "Active products",
                value: data?.totals.totalProducts,
                hint: "Products currently in the catalogue",
                icon: Boxes,
                tone: "default" as const
              },
              {
                label: "Units in stock",
                value: data?.totals.totalUnits,
                hint: "Sum of all ledger balances",
                icon: Layers,
                tone: "default" as const
              },
              {
                label: "Low stock",
                value: data?.totals.lowStockCount,
                hint: "At or below their threshold",
                icon: TriangleAlert,
                tone: "warn" as const
              },
              {
                label: "Out of stock",
                value: data?.totals.outOfStockCount,
                hint: "Zero available units",
                icon: CircleAlert,
                tone: "danger" as const
              }
            ].map((metric) => (
              <motion.div
                key={metric.label}
                variants={{
                  hidden: reduceMotion ? {} : { opacity: 0, y: 8 },
                  visible: { opacity: 1, y: 0 }
                }}
                transition={{ duration: reduceMotion ? 0 : 0.3 }}
              >
                <MetricCard
                  label={metric.label}
                  value={metric.value}
                  hint={metric.hint}
                  icon={metric.icon}
                  tone={metric.tone}
                  loading={dashboardQuery.isPending}
                />
              </motion.div>
            ))}
          </motion.section>

          <div className="grid gap-4 lg:grid-cols-3">
            <section className="rounded-xl border border-line bg-surface shadow-card lg:col-span-2">
              <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3.5 sm:px-5">
                <div>
                  <h2 className="font-display text-[14px] font-bold text-ink-900">
                    Stock activity
                  </h2>
                  <p className="mt-0.5 text-[11px] text-ink-400">
                    Units in and out over the last 14 days
                  </p>
                </div>
                <div className="flex items-center gap-3 text-[10px] font-medium text-ink-500">
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-emerald-500" aria-hidden="true" />
                    In
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-brand-500" aria-hidden="true" />
                    Out
                  </span>
                </div>
              </div>
              <div className="px-2 pb-4 pt-4 sm:px-3">
                {dashboardQuery.isPending ? (
                  <Skeleton className="mx-3 h-56 w-[calc(100%-1.5rem)]" />
                ) : hasActivity ? (
                  <div
                    role="img"
                    aria-label="Area chart of incoming and outgoing stock units over the last 14 days"
                  >
                    <ResponsiveContainer width="100%" height={236}>
                      <AreaChart data={data?.activity ?? []} margin={{ top: 6, right: 12, left: -16, bottom: 0 }}>
                        <defs>
                          <linearGradient id="incomingFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" stopOpacity={0.22} />
                            <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="outgoingFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#f26722" stopOpacity={0.2} />
                            <stop offset="100%" stopColor="#f26722" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ece5dc" vertical={false} />
                        <XAxis
                          dataKey="day"
                          tickFormatter={formatDay}
                          tick={{ fontSize: 10, fill: "#7a6b5f" }}
                          axisLine={false}
                          tickLine={false}
                          interval="preserveStartEnd"
                          minTickGap={24}
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: "#7a6b5f" }}
                          axisLine={false}
                          tickLine={false}
                          allowDecimals={false}
                          width={40}
                        />
                        <Tooltip content={<ChartTooltip />} />
                        <Area
                          type="monotone"
                          dataKey="incoming"
                          name="Received"
                          stroke="#059669"
                          strokeWidth={2}
                          fill="url(#incomingFill)"
                          isAnimationActive={!reduceMotion}
                          animationDuration={500}
                        />
                        <Area
                          type="monotone"
                          dataKey="outgoing"
                          name="Removed"
                          stroke="#f26722"
                          strokeWidth={2}
                          fill="url(#outgoingFill)"
                          isAnimationActive={!reduceMotion}
                          animationDuration={500}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyState
                    icon={History}
                    title="No activity in the last two weeks"
                    description="Record a purchase or sale and the ledger will draw its first line here."
                    className="py-10"
                  />
                )}
              </div>
            </section>

            <section className="rounded-xl border border-line bg-surface shadow-card">
              <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3.5 sm:px-5">
                <h2 className="font-display text-[14px] font-bold text-ink-900">
                  Needs attention
                </h2>
                {user?.role === "OWNER" ? (
                  <Link
                    to="/low-stock"
                    className="text-[11px] font-semibold text-brand-700 hover:text-brand-800"
                  >
                    View report
                  </Link>
                ) : null}
              </div>
              {dashboardQuery.isPending ? (
                <div className="space-y-3 p-4">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="flex items-center justify-between gap-3">
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3 w-32" />
                        <Skeleton className="h-2.5 w-20" />
                      </div>
                      <Skeleton className="h-5 w-14" />
                    </div>
                  ))}
                </div>
              ) : data && data.lowStock.length > 0 ? (
                <ul className="divide-y divide-line/80">
                  {data.lowStock.map((product) => (
                    <li key={product.id}>
                      <Link
                        to={`/products/${product.id}`}
                        className="flex items-center justify-between gap-3 px-4 py-2.5 transition-colors hover:bg-ink-50/50 sm:px-5"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-[12px] font-semibold text-ink-900">
                            {product.name}
                          </p>
                          <p className="mt-0.5 text-[10px] text-ink-400">
                            {product.stock} {product.unit} · threshold {product.lowStockThreshold}
                          </p>
                        </div>
                        <StockBadge
                          stock={product.stock}
                          threshold={product.lowStockThreshold}
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  icon={CircleAlert}
                  title="Everything is healthy"
                  description="No products are at or below their low-stock threshold."
                  className="py-10"
                />
              )}
            </section>
          </div>

          <section className="rounded-xl border border-line bg-surface shadow-card">
            <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3.5 sm:px-5">
              <div>
                <h2 className="font-display text-[14px] font-bold text-ink-900">
                  Recent movements
                </h2>
                <p className="mt-0.5 text-[11px] text-ink-400">
                  The latest entries in your stock ledger
                </p>
              </div>
              <Link
                to="/movements"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-700 hover:text-brand-800"
              >
                Full ledger
                <ArrowRight className="size-3" aria-hidden="true" />
              </Link>
            </div>

            {dashboardQuery.isPending ? (
              <div className="p-4">
                <TableSkeleton rows={5} columns={4} />
              </div>
            ) : data && data.recentMovements.length > 0 ? (
              <ul className="divide-y divide-line/80">
                {data.recentMovements.map((movement) => {
                  const incoming = MOVEMENT_META[movement.type].direction === "in";
                  return (
                    <li key={movement.id}>
                      <Link
                        to={`/products/${movement.product.id}`}
                        className="flex flex-col gap-2 px-4 py-3 transition-colors hover:bg-ink-50/50 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span
                            className={cn(
                              "grid size-8 shrink-0 place-items-center rounded-lg",
                              incoming
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-brand-50 text-brand-700"
                            )}
                          >
                            <History className="size-3.5" aria-hidden="true" />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-[12.5px] font-semibold text-ink-900">
                              {movement.product.name}
                            </p>
                            <p className="truncate text-[11px] text-ink-400">
                              {MOVEMENT_META[movement.type].label} · {movement.reason}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-4 pl-11 sm:justify-end sm:pl-0">
                          <MovementQuantity movement={movement} />
                          <span className="w-32 text-right text-[10px] text-ink-400">
                            {movement.actor.name} · {relativeTime(movement.occurredAt)}
                          </span>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState
                icon={PackagePlus}
                title="No movements yet"
                description="Purchases, sales, returns and adjustments will appear here as soon as they are recorded."
                action={
                  <Button variant="outline" size="sm" onClick={() => setMovementOpen(true)}>
                    Record the first movement
                  </Button>
                }
              />
            )}
          </section>

          {dashboardQuery.isPending ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </div>
          ) : null}
        </>
      )}

      {user ? (
        <>
          <MovementDialog
            open={movementOpen}
            onOpenChange={setMovementOpen}
            role={user.role}
          />
          <ProductFormDialog open={productOpen} onOpenChange={setProductOpen} />
        </>
      ) : null}
    </div>
  );
}
