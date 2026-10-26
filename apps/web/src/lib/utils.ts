import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { MovementType, Role } from "../types";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2
});

export function formatCurrency(value: string | number): string {
  const numeric = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(numeric) ? currencyFormatter.format(numeric) : "—";
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}

export function formatDay(value: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(
    new Date(`${value}T12:00:00Z`)
  );
}

export function relativeTime(value: string): string {
  const target = new Date(value).getTime();
  const now = Date.now();
  const diffMinutes = Math.round((target - now) / 60_000);
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (Math.abs(diffMinutes) < 60) return formatter.format(diffMinutes, "minute");
  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) return formatter.format(diffHours, "hour");
  const diffDays = Math.round(diffHours / 24);
  if (Math.abs(diffDays) < 30) return formatter.format(diffDays, "day");
  return formatDate(value);
}

export type StockTone = "out" | "low" | "healthy";

export function stockState(
  stock: number,
  threshold: number
): { tone: StockTone; label: string } {
  if (stock <= 0) return { tone: "out", label: "Out of stock" };
  if (stock <= threshold) return { tone: "low", label: "Low stock" };
  return { tone: "healthy", label: "In stock" };
}

export const MOVEMENT_META: Record<
  MovementType,
  { label: string; shortLabel: string; direction: "in" | "out" }
> = {
  PURCHASE_IN: { label: "Purchase in", shortLabel: "Purchase", direction: "in" },
  SALE_OUT: { label: "Sale out", shortLabel: "Sale", direction: "out" },
  RETURN_IN: { label: "Customer return", shortLabel: "Return", direction: "in" },
  ADJUSTMENT_IN: { label: "Adjustment in", shortLabel: "Adjustment", direction: "in" },
  ADJUSTMENT_OUT: { label: "Adjustment out", shortLabel: "Adjustment", direction: "out" }
};

export const MOVEMENT_TYPES: MovementType[] = [
  "PURCHASE_IN",
  "SALE_OUT",
  "RETURN_IN",
  "ADJUSTMENT_IN",
  "ADJUSTMENT_OUT"
];

export function roleLabel(role: Role): string {
  return role === "OWNER" ? "Owner" : "Staff";
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function canRecordType(role: Role, type: MovementType): boolean {
  if (role === "OWNER") return true;
  return type === "SALE_OUT" || type === "RETURN_IN";
}
