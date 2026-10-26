import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Boxes,
  FileSpreadsheet,
  History,
  LayoutDashboard,
  Menu,
  ShieldCheck,
  TriangleAlert,
  X
} from "lucide-react";
import { useAuth } from "../../hooks/use-auth";
import { useToast } from "../ui/toast";
import { AccountMenu } from "./account-menu";
import { cn } from "../../lib/utils";
import type { Role } from "../../types";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
  ownerOnly?: boolean;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/products", label: "Products", icon: Boxes },
  { to: "/movements", label: "Movement ledger", icon: History },
  { to: "/low-stock", label: "Low stock", icon: TriangleAlert, ownerOnly: true },
  { to: "/reports", label: "Reports & export", icon: FileSpreadsheet, ownerOnly: true }
];

function visibleItems(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => !item.ownerOnly || role === "OWNER");
}

function BrandMark() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid size-9 place-items-center rounded-xl bg-brand-500 shadow-[0_10px_24px_-14px_rgba(242,103,34,0.9)]">
        <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true" fill="none">
          <path
            d="M5.5 7h13M5.5 12h8.5M5.5 17h11"
            stroke="#FFF8F3"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="18" cy="12" r="1.9" fill="#1B1613" />
        </svg>
      </span>
      <div className="leading-tight">
        <span className="block font-display text-[15px] font-extrabold tracking-tight text-ink-900">
          StockLedger
        </span>
        <span className="block text-[10px] font-medium uppercase tracking-[0.14em] text-ink-400">
          Inventory workspace
        </span>
      </div>
    </div>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useAuth();
  if (!user) return null;
  const items = visibleItems(user.role);

  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pb-6 pt-6">
        <BrandMark />
      </div>

      <div className="px-5">
        <div className="rounded-xl border border-line bg-ink-50/60 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-md bg-surface text-[10px] font-bold text-ink-700 shadow-sm">
              RS
            </span>
            <div className="min-w-0">
              <p className="truncate text-[12px] font-semibold text-ink-800">Riverside Supply</p>
              <p className="text-[10px] text-ink-400">Main store · USD</p>
            </div>
          </div>
        </div>
      </div>

      <p className="px-5 pb-2 pt-6 text-[10px] font-bold uppercase tracking-[0.16em] text-ink-400">
        Workspace
      </p>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3" aria-label="Main navigation">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "group relative flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors",
                isActive
                  ? "bg-brand-50 text-brand-800"
                  : "text-ink-600 hover:bg-ink-50 hover:text-ink-900"
              )
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={cn(
                    "absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full transition-opacity",
                    isActive ? "bg-brand-500 opacity-100" : "opacity-0"
                  )}
                  aria-hidden="true"
                />
                <item.icon
                  className={cn("size-4", isActive ? "text-brand-600" : "text-ink-400")}
                  aria-hidden="true"
                />
                {item.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="m-3 rounded-xl border border-line bg-surface p-3">
        <div className="flex items-center gap-2 text-[11px] font-semibold text-ink-700">
          <ShieldCheck className="size-3.5 text-emerald-600" aria-hidden="true" />
          Ledger-first inventory
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-ink-400">
          Stock is derived from recorded movements — never typed in.
        </p>
      </div>
    </div>
  );
}

function MobileNav({
  open,
  onOpenChange
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open ? (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-40 bg-ink-950/45"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.18 }}
              />
            </DialogPrimitive.Overlay>
            <DialogPrimitive.Content asChild forceMount>
              <motion.div
                className="fixed inset-y-0 left-0 z-50 w-[82%] max-w-72 border-r border-line bg-canvas shadow-pop"
                initial={reduceMotion ? false : { x: "-100%" }}
                animate={{ x: 0 }}
                exit={reduceMotion ? { opacity: 0 } : { x: "-100%" }}
                transition={{ duration: reduceMotion ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] }}
              >
                <DialogPrimitive.Title className="sr-only">Main navigation</DialogPrimitive.Title>
                <DialogPrimitive.Close
                  className="absolute right-3 top-4 z-10 rounded-md p-2 text-ink-500 hover:bg-ink-100"
                  aria-label="Close navigation"
                >
                  <X className="size-4" aria-hidden="true" />
                </DialogPrimitive.Close>
                <SidebarContent onNavigate={() => onOpenChange(false)} />
              </motion.div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        ) : null}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
}

function currentSection(pathname: string): { label: string; parent?: string } {
  if (pathname === "/") return { label: "Overview" };
  if (pathname.startsWith("/products/")) return { label: "Product details", parent: "Products" };
  if (pathname.startsWith("/products")) return { label: "Products" };
  if (pathname.startsWith("/movements")) return { label: "Movement ledger" };
  if (pathname.startsWith("/low-stock")) return { label: "Low stock" };
  if (pathname.startsWith("/reports")) return { label: "Reports & export" };
  return { label: "Workspace" };
}

export function AppShell() {
  const { user, logout, isLoggingOut } = useAuth();
  const { toast } = useToast();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const section = currentSection(location.pathname);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  if (!user) return null;

  const handleLogout = async () => {
    try {
      await logout();
      // Explicit sign-out always lands on a fresh dashboard after signing back
      // in, rather than restoring the page the user just left.
      navigate("/login", { replace: true, state: { from: "/" } });
    } catch {
      toast({
        title: "Could not sign out",
        description: "Please check your connection and try again.",
        variant: "error"
      });
    }
  };

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[264px_minmax(0,1fr)]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[80] focus:rounded-lg focus:bg-ink-900 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to content
      </a>

      <aside className="sticky top-0 hidden h-dvh border-r border-line bg-canvas lg:block">
        <SidebarContent />
      </aside>

      <MobileNav open={mobileOpen} onOpenChange={setMobileOpen} />

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-line bg-canvas/85 px-4 backdrop-blur-md sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="grid size-9 place-items-center rounded-lg border border-line bg-surface text-ink-600 lg:hidden"
              aria-label="Open navigation"
            >
              <Menu className="size-4" aria-hidden="true" />
            </button>
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">
                <span className="hidden sm:inline">Workspace</span>
                <span className="hidden text-ink-300 sm:inline" aria-hidden="true">
                  /
                </span>
                {section.parent ? (
                  <>
                    <span className="text-ink-400">{section.parent}</span>
                    <span className="text-ink-300" aria-hidden="true">
                      /
                    </span>
                  </>
                ) : null}
                <span className="text-ink-600">{section.label}</span>
              </p>
              <p className="mt-0.5 truncate font-display text-[15px] font-bold text-ink-900">
                {section.label}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-800 sm:inline-flex">
              <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
              Ledger synced
            </span>
            <AccountMenu
              user={user}
              onLogout={handleLogout}
              loggingOut={isLoggingOut}
            />
          </div>
        </header>

        <main id="main-content" className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <motion.div
            key={location.pathname}
            initial={reduceMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.25, ease: "easeOut" }}
            className="mx-auto w-full max-w-[1360px]"
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
}
