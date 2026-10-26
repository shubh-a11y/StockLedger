import { ArrowDownLeft, ArrowUpRight, CircleAlert, CircleCheck } from "lucide-react";
import type { MovementType } from "../../types";
import { cn, MOVEMENT_META, stockState } from "../../lib/utils";

type Tone = "healthy" | "low" | "out" | "neutral" | "brand" | "ink";

const tones: Record<Tone, string> = {
  healthy: "border-emerald-200 bg-emerald-50 text-emerald-800",
  low: "border-amber-200 bg-amber-50 text-amber-800",
  out: "border-red-200 bg-red-50 text-red-700",
  neutral: "border-line bg-ink-50 text-ink-600",
  brand: "border-brand-200 bg-brand-50 text-brand-800",
  ink: "border-ink-700 bg-ink-900 text-white"
};

interface BadgeProps {
  tone?: Tone;
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export function Badge({ tone = "neutral", children, icon, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-semibold leading-5",
        tones[tone],
        className
      )}
    >
      {icon}
      {children}
    </span>
  );
}

export function StockBadge({ stock, threshold }: { stock: number; threshold: number }) {
  const state = stockState(stock, threshold);
  const tone: Tone = state.tone === "healthy" ? "healthy" : state.tone === "low" ? "low" : "out";
  return (
    <Badge
      tone={tone}
      icon={
        state.tone === "healthy" ? (
          <CircleCheck className="size-3" aria-hidden="true" />
        ) : (
          <CircleAlert className="size-3" aria-hidden="true" />
        )
      }
    >
      {state.label}
    </Badge>
  );
}

export function MovementBadge({ type }: { type: MovementType }) {
  const meta = MOVEMENT_META[type];
  const incoming = meta.direction === "in";
  return (
    <Badge
      tone={incoming ? "healthy" : "out"}
      icon={
        incoming ? (
          <ArrowDownLeft className="size-3" aria-hidden="true" />
        ) : (
          <ArrowUpRight className="size-3" aria-hidden="true" />
        )
      }
    >
      {meta.label}
    </Badge>
  );
}
