import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, Info, TriangleAlert, X } from "lucide-react";
import { cn } from "../../lib/utils";

type ToastVariant = "success" | "error" | "info";

interface ToastItem {
  id: number;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (input: { title: string; description?: string; variant?: ToastVariant }) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const variantStyles: Record<ToastVariant, string> = {
  success: "border-emerald-200",
  error: "border-red-200",
  info: "border-line"
};

const variantIcon: Record<ToastVariant, ReactNode> = {
  success: <CheckCircle2 className="size-4 text-emerald-600" aria-hidden="true" />,
  error: <TriangleAlert className="size-4 text-red-600" aria-hidden="true" />,
  info: <Info className="size-4 text-ink-500" aria-hidden="true" />
};

export function ToastProvider({ children }: { children: ReactNode }): JSX.Element {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const reduceMotion = useReducedMotion();

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((item) => item.id !== id));
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
  }, []);

  const toast = useCallback<ToastContextValue["toast"]>(
    ({ title, description, variant = "info" }) => {
      counter.current += 1;
      const id = counter.current;
      setToasts((current) => [...current.slice(-3), { id, title, description, variant }]);
      const timer = setTimeout(() => dismiss(id), variant === "error" ? 6500 : 4500);
      timers.current.set(id, timer);
    },
    [dismiss]
  );

  useEffect(() => {
    const activeTimers = timers.current;
    return () => {
      activeTimers.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[70] flex flex-col items-center gap-2 p-4 sm:items-end sm:p-5"
        aria-live="polite"
        aria-atomic="false"
      >
        <AnimatePresence initial={false}>
          {toasts.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={reduceMotion ? false : { opacity: 0, y: 14, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: reduceMotion ? 0 : 0.2 }}
              className={cn(
                "pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-xl border bg-surface px-3.5 py-3 shadow-lift",
                variantStyles[item.variant]
              )}
              role="status"
            >
              <span className="mt-0.5">{variantIcon[item.variant]}</span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-ink-900">{item.title}</p>
                {item.description ? (
                  <p className="mt-0.5 text-xs leading-relaxed text-ink-500">{item.description}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                className="rounded p-1 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
                aria-label="Dismiss notification"
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}
