import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "../../lib/utils";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg" | "icon";

const variants: Record<Variant, string> = {
  primary:
    "bg-brand-500 text-white shadow-[0_8px_20px_-12px_rgba(242,103,34,0.9)] hover:bg-brand-600 active:bg-brand-700",
  secondary: "bg-ink-900 text-white hover:bg-ink-800 active:bg-ink-700",
  outline:
    "border border-line bg-surface text-ink-800 shadow-[0_1px_1px_rgba(27,22,19,0.03)] hover:border-ink-300 hover:bg-ink-50/60",
  ghost: "text-ink-600 hover:bg-ink-100/70 hover:text-ink-900",
  danger: "bg-red-600 text-white hover:bg-red-700"
};

const sizes: Record<Size, string> = {
  sm: "h-8 gap-1.5 px-3 text-xs",
  md: "h-10 gap-2 px-4 text-[13px]",
  lg: "h-11 gap-2 px-5 text-sm",
  icon: "h-9 w-9 justify-center"
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", loading = false, disabled, children, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex select-none items-center justify-center rounded-lg font-semibold transition-colors duration-150",
        "disabled:pointer-events-none disabled:opacity-55",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500",
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
      {children}
    </button>
  );
});
