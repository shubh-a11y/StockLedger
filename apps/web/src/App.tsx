import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./hooks/use-auth";
import { AppShell } from "./components/layout/app-shell";
import { LoginPage } from "./pages/login-page";
import { DashboardPage } from "./pages/dashboard-page";
import { ProductsPage } from "./pages/products-page";
import { ProductDetailPage } from "./pages/product-detail-page";
import { MovementsPage } from "./pages/movements-page";
import { LowStockPage } from "./pages/low-stock-page";
import { ReportsPage } from "./pages/reports-page";
import { AccessDeniedPage, NotFoundPage } from "./pages/error-pages";
import type { ReactNode } from "react";

function BootSplash() {
  return (
    <div className="grid min-h-dvh place-items-center bg-canvas px-6">
      <div className="flex flex-col items-center gap-4 text-center" role="status">
        <span className="grid size-11 animate-pulse place-items-center rounded-xl bg-brand-500">
          <svg viewBox="0 0 24 24" className="size-5" fill="none" aria-hidden="true">
            <path
              d="M5.5 7h13M5.5 12h8.5M5.5 17h11"
              stroke="#FFF8F3"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <circle cx="18" cy="12" r="1.9" fill="#1B1613" />
          </svg>
        </span>
        <div>
          <p className="font-display text-sm font-bold text-ink-900">Opening your ledger…</p>
          <p className="mt-1 text-xs text-ink-400">Checking your session</p>
        </div>
      </div>
    </div>
  );
}

function ProtectedLayout() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === "loading") return <BootSplash />;
  if (status === "anonymous") {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  }

  return <AppShell />;
}

function OwnerOnly({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (user?.role !== "OWNER") return <AccessDeniedPage />;
  return <>{children}</>;
}

export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="products/:id" element={<ProductDetailPage />} />
          <Route path="movements" element={<MovementsPage />} />
          <Route
            path="low-stock"
            element={
              <OwnerOnly>
                <LowStockPage />
              </OwnerOnly>
            }
          />
          <Route
            path="reports"
            element={
              <OwnerOnly>
                <ReportsPage />
              </OwnerOnly>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
