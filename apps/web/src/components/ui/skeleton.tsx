import { cn } from "../../lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-md bg-ink-100/90", className)}
    />
  );
}

export function TableSkeleton({ rows = 6, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-2.5" role="status" aria-label="Loading data">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex items-center gap-4">
          {Array.from({ length: columns }).map((__, columnIndex) => (
            <Skeleton
              key={columnIndex}
              className={cn("h-9 flex-1", columnIndex === 0 && "max-w-14", columnIndex === columns - 1 && "max-w-24")}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-xl border border-line bg-surface p-5 shadow-card">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-4 h-8 w-20" />
      <Skeleton className="mt-3 h-3 w-32" />
    </div>
  );
}
