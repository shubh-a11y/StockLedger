import { Link } from "react-router-dom";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import type { Movement } from "../../types";
import { cn, formatDateTime, MOVEMENT_META } from "../../lib/utils";
import { MovementBadge } from "../ui/badge";

export function MovementQuantity({ movement }: { movement: Movement }) {
  const incoming = MOVEMENT_META[movement.type].direction === "in";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-semibold tabular-nums",
        incoming ? "text-emerald-700" : "text-brand-700"
      )}
    >
      {incoming ? (
        <ArrowDownLeft className="size-3.5" aria-hidden="true" />
      ) : (
        <ArrowUpRight className="size-3.5" aria-hidden="true" />
      )}
      {incoming ? "+" : "−"}
      {movement.quantity}
      <span className="sr-only">{incoming ? "units added" : "units removed"}</span>
    </span>
  );
}

interface MovementTableProps {
  movements: Movement[];
  showProduct?: boolean;
}

export function MovementTable({ movements, showProduct = true }: MovementTableProps) {
  return (
    <>
      {/* Desktop table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[820px] border-collapse text-left">
          <thead>
            <tr className="border-b border-line text-[10px] font-bold uppercase tracking-[0.12em] text-ink-400">
              {showProduct ? <th className="px-4 py-2.5 font-bold">Product</th> : null}
              <th className="px-4 py-2.5 font-bold">Type</th>
              <th className="px-4 py-2.5 text-right font-bold">Qty</th>
              <th className="px-4 py-2.5 font-bold">Reason</th>
              <th className="px-4 py-2.5 font-bold">Actor</th>
              <th className="px-4 py-2.5 font-bold">When</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/80">
            {movements.map((movement) => (
              <tr key={movement.id} className="group transition-colors hover:bg-ink-50/40">
                {showProduct ? (
                  <td className="px-4 py-3">
                    <Link
                      to={`/products/${movement.product.id}`}
                      className="block max-w-56 truncate text-[13px] font-semibold text-ink-900 hover:text-brand-700"
                    >
                      {movement.product.name}
                    </Link>
                    <span className="text-[11px] font-medium text-ink-400">
                      {movement.product.sku}
                    </span>
                  </td>
                ) : null}
                <td className="px-4 py-3">
                  <MovementBadge type={movement.type} />
                </td>
                <td className="px-4 py-3 text-right text-[13px]">
                  <MovementQuantity movement={movement} />
                </td>
                <td className="max-w-64 px-4 py-3">
                  <p className="truncate text-[12px] text-ink-700">{movement.reason}</p>
                  {movement.reference ? (
                    <p className="truncate text-[11px] text-ink-400">Ref {movement.reference}</p>
                  ) : null}
                </td>
                <td className="px-4 py-3">
                  <p className="text-[12px] font-medium text-ink-700">{movement.actor.name}</p>
                  <p className="text-[10px] uppercase tracking-wider text-ink-400">
                    {movement.actor.role}
                  </p>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-[11px] text-ink-500">
                  {formatDateTime(movement.occurredAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <ul className="divide-y divide-line md:hidden">
        {movements.map((movement) => (
          <li key={movement.id} className="px-4 py-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {showProduct ? (
                  <Link
                    to={`/products/${movement.product.id}`}
                    className="block truncate text-[13px] font-semibold text-ink-900"
                  >
                    {movement.product.name}
                  </Link>
                ) : (
                  <p className="text-[13px] font-semibold text-ink-900">{movement.reason}</p>
                )}
                <p className="mt-0.5 text-[11px] text-ink-400">
                  {showProduct ? movement.product.sku : movement.reason}
                </p>
              </div>
              <MovementQuantity movement={movement} />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <MovementBadge type={movement.type} />
              <span className="text-[11px] text-ink-500">
                {movement.actor.name} · {formatDateTime(movement.occurredAt)}
              </span>
            </div>
            {showProduct && movement.reference ? (
              <p className="mt-1.5 text-[11px] text-ink-400">Ref {movement.reference}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </>
  );
}
