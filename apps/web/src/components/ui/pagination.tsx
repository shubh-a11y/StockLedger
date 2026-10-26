import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Pagination as PaginationMeta } from "../../types";
import { formatNumber } from "../../lib/utils";
import { Button } from "./button";

interface PaginationProps {
  pagination: PaginationMeta;
  onPageChange: (page: number) => void;
  itemLabel?: string;
}

export function Pagination({ pagination, onPageChange, itemLabel = "items" }: PaginationProps) {
  const { page, totalPages, total, pageSize } = pagination;
  if (total === 0) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <nav
      className="flex flex-col items-center justify-between gap-3 border-t border-line px-4 py-3 sm:flex-row"
      aria-label="Pagination"
    >
      <p className="text-[11px] text-ink-500">
        Showing <span className="font-semibold text-ink-700">{formatNumber(from)}</span>–
        <span className="font-semibold text-ink-700">{formatNumber(to)}</span> of{" "}
        <span className="font-semibold text-ink-700">{formatNumber(total)}</span> {itemLabel}
      </p>
      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft className="size-3.5" aria-hidden="true" />
          Previous
        </Button>
        <span className="px-2 text-[11px] font-medium text-ink-500" aria-current="page">
          {page} / {Math.max(1, totalPages)}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
        >
          Next
          <ChevronRight className="size-3.5" aria-hidden="true" />
        </Button>
      </div>
    </nav>
  );
}
