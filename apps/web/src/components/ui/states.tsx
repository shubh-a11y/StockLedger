import type { LucideIcon } from "lucide-react";
import { RefreshCw, ServerCrash } from "lucide-react";
import { Button } from "./button";
import { cn } from "../../lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-6 py-14 text-center",
        className
      )}
    >
      <span className="mb-4 grid size-12 place-items-center rounded-xl border border-brand-100 bg-brand-50 text-brand-600">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <h3 className="font-display text-sm font-bold text-ink-900">{title}</h3>
      <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-ink-500">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "We could not load this",
  message = "The server did not respond as expected. Please try again.",
  onRetry,
  className
}: ErrorStateProps) {
  return (
    <div
      className={cn("flex flex-col items-center justify-center px-6 py-14 text-center", className)}
      role="alert"
    >
      <span className="mb-4 grid size-12 place-items-center rounded-xl border border-red-100 bg-red-50 text-red-600">
        <ServerCrash className="size-5" aria-hidden="true" />
      </span>
      <h3 className="font-display text-sm font-bold text-ink-900">{title}</h3>
      <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-ink-500">{message}</p>
      {onRetry ? (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          <RefreshCw className="size-3.5" aria-hidden="true" />
          Try again
        </Button>
      ) : null}
    </div>
  );
}
