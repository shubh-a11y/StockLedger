import * as DialogPrimitive from "@radix-ui/react-dialog";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
}

const sizes = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl" };

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = "md"
}: ModalProps) {
  const reduceMotion = useReducedMotion();

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open ? (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-40 bg-ink-950/45 backdrop-blur-[2px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.18 }}
              />
            </DialogPrimitive.Overlay>
            <div className="pointer-events-none fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-5">
              <DialogPrimitive.Content asChild forceMount>
                <motion.div
                  className={cn(
                    "pointer-events-auto flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-line bg-surface shadow-pop sm:rounded-2xl",
                    sizes[size]
                  )}
                  initial={reduceMotion ? false : { opacity: 0, y: 18, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.985 }}
                  transition={{ duration: reduceMotion ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
                    <div className="space-y-1">
                      <DialogPrimitive.Title className="font-display text-base font-bold text-ink-900">
                        {title}
                      </DialogPrimitive.Title>
                      {description ? (
                        <DialogPrimitive.Description className="text-xs leading-relaxed text-ink-500">
                          {description}
                        </DialogPrimitive.Description>
                      ) : null}
                    </div>
                    <DialogPrimitive.Close
                      className="rounded-md p-1.5 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
                      aria-label="Close dialog"
                    >
                      <X className="size-4" aria-hidden="true" />
                    </DialogPrimitive.Close>
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>

                  {footer ? (
                    <div className="flex flex-col-reverse gap-2 border-t border-line bg-ink-50/40 px-5 py-3.5 sm:flex-row sm:justify-end">
                      {footer}
                    </div>
                  ) : null}
                </motion.div>
              </DialogPrimitive.Content>
            </div>
          </DialogPrimitive.Portal>
        ) : null}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
}
