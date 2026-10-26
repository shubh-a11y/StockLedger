import {
  cloneElement,
  forwardRef,
  isValidElement,
  type ReactElement,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes
} from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "../../lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, ...props },
  ref
) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        "h-10 w-full rounded-lg border border-line bg-surface px-3 text-[13px] text-ink-900 shadow-[inset_0_1px_1px_rgba(27,22,19,0.02)]",
        "placeholder:text-ink-400 transition-colors",
        "focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-500/12",
        "disabled:cursor-not-allowed disabled:bg-ink-50 disabled:text-ink-400",
        invalid && "border-red-400 focus:border-red-500 focus:ring-red-500/10",
        className
      )}
      {...props}
    />
  );
});

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, invalid, ...props },
  ref
) {
  return (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        "min-h-20 w-full resize-y rounded-lg border border-line bg-surface px-3 py-2 text-[13px] text-ink-900",
        "placeholder:text-ink-400 transition-colors",
        "focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-500/12",
        invalid && "border-red-400 focus:border-red-500 focus:ring-red-500/10",
        className
      )}
      {...props}
    />
  );
});

interface FieldProps {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function Field({ label, htmlFor, hint, error, required, children, className }: FieldProps) {
  // Associate the control with its hint or error so screen readers announce it.
  const describedBy = error ? `${htmlFor}-error` : hint ? `${htmlFor}-hint` : undefined;
  const control = isValidElement(children)
    ? cloneElement(children as ReactElement<Record<string, unknown>>, {
        "aria-describedby": describedBy
      })
    : children;

  return (
    <div className={cn("space-y-1.5", className)}>
      <label
        htmlFor={htmlFor}
        className="flex items-center gap-1 text-[12px] font-semibold text-ink-700"
      >
        {label}
        {required ? (
          <span className="text-brand-600" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>
      {control}
      {hint && !error ? (
        <p id={`${htmlFor}-hint`} className="text-[11px] text-ink-400">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p
          id={`${htmlFor}-error`}
          className="flex items-start gap-1 text-[11px] font-medium text-red-600"
          role="alert"
        >
          <AlertCircle className="mt-px size-3 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : null}
    </div>
  );
}
