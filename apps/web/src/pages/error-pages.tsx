import { Link } from "react-router-dom";
import { ArrowLeft, Compass, ShieldAlert } from "lucide-react";

export function AccessDeniedPage() {
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-line bg-surface px-6 py-14 text-center shadow-card">
      <span className="mx-auto mb-4 grid size-12 place-items-center rounded-xl border border-amber-200 bg-amber-50 text-amber-700">
        <ShieldAlert className="size-5" aria-hidden="true" />
      </span>
      <h1 className="font-display text-lg font-bold text-ink-900">Owner access required</h1>
      <p className="mt-2 text-[13px] leading-relaxed text-ink-500">
        This area is restricted to owners. Your account has staff permissions, so inventory
        reporting and exports are not available.
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex h-10 items-center gap-2 rounded-lg border border-line bg-surface px-4 text-[13px] font-semibold text-ink-800 transition-colors hover:bg-ink-50"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to overview
      </Link>
    </div>
  );
}

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-line bg-surface px-6 py-14 text-center shadow-card">
      <span className="mx-auto mb-4 grid size-12 place-items-center rounded-xl border border-line bg-ink-50 text-ink-500">
        <Compass className="size-5" aria-hidden="true" />
      </span>
      <h1 className="font-display text-lg font-bold text-ink-900">Page not found</h1>
      <p className="mt-2 text-[13px] leading-relaxed text-ink-500">
        The page you followed may have moved. Head back to the inventory overview to keep working.
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex h-10 items-center gap-2 rounded-lg bg-ink-900 px-4 text-[13px] font-semibold text-white transition-colors hover:bg-ink-800"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to overview
      </Link>
    </div>
  );
}
