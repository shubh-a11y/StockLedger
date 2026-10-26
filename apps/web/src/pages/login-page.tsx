import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Eye,
  EyeOff,
  History,
  LockKeyhole,
  ShieldCheck,
  TriangleAlert
} from "lucide-react";
import { useAuth } from "../hooks/use-auth";
import { ApiRequestError } from "../lib/api";
import { Button } from "../components/ui/button";
import { Field, Input } from "../components/ui/input";

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Enter your email address.")
    .email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password.")
});

type LoginForm = z.infer<typeof loginSchema>;

const DEMO_ACCOUNTS = [
  { label: "Owner", email: "owner@example.com", password: "OwnerDemo123!" },
  { label: "Staff", email: "staff@example.com", password: "StaffDemo123!" }
];

export function LoginPage(): JSX.Element {
  const { user, status, login, isLoggingIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors }
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" }
  });

  const from = (location.state as { from?: string } | null)?.from ?? "/";

  if (status === "authenticated" && user) {
    return <Navigate to={from} replace />;
  }

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await login(values.email, values.password);
      navigate(from, { replace: true });
    } catch (error) {
      if (error instanceof ApiRequestError) {
        setServerError(
          error.code === "TOO_MANY_REQUESTS"
            ? "Too many sign-in attempts. Please wait a few minutes and try again."
            : error.message
        );
      } else {
        setServerError("Unable to sign in right now. Please try again.");
      }
    }
  });

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-ink-950 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(1100px 520px at 8% 0%, rgba(242,103,34,0.28), transparent 62%), radial-gradient(700px 420px at 90% 92%, rgba(242,103,34,0.12), transparent 60%)"
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
            backgroundSize: "56px 56px"
          }}
        />

        <div className="relative flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-brand-500">
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
            <p className="font-display text-lg font-extrabold tracking-tight text-white">
              StockLedger
            </p>
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-brand-200/80">
              Inventory workspace
            </p>
          </div>
        </div>

        <div className="relative max-w-md">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-200">
            <span className="size-1.5 rounded-full bg-brand-400" aria-hidden="true" />
            Ledger-first inventory
          </p>
          <h1 className="font-display text-[40px] font-extrabold leading-[1.08] tracking-tight text-white text-balance">
            Every unit accounted for.
            <span className="block text-brand-400">Every movement recorded.</span>
          </h1>
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-ink-200/80">
            StockLedger turns purchases, sales, returns and adjustments into a single auditable
            ledger — so your on-hand stock always tells the truth.
          </p>

          <ul className="mt-8 space-y-4">
            {[
              {
                icon: History,
                title: "Auditable movement history",
                copy: "See who moved what, when and why."
              },
            {
                icon: ShieldCheck,
                title: "Owner and staff permissions",
                copy: "Sensitive operations stay owner-only, enforced server-side."
              },
              {
                icon: LockKeyhole,
                title: "Stock you can trust",
                copy: "Concurrent sales can never oversell the last unit."
              }
            ].map((item) => (
              <li key={item.title} className="flex items-start gap-3">
                <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/5 text-brand-300">
                  <item.icon className="size-4" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-[13px] font-semibold text-white">{item.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-ink-300/80">{item.copy}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-[11px] text-ink-400">
          Built for shops that count. · Stock is derived from movements, never typed in.
        </p>
      </div>

      {/* Form panel */}
      <div className="flex flex-col justify-center bg-canvas px-5 py-10 sm:px-10 lg:px-14">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.35, ease: "easeOut" }}
          className="mx-auto w-full max-w-[400px]"
        >
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="grid size-9 place-items-center rounded-xl bg-brand-500">
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
            <span className="font-display text-[17px] font-extrabold tracking-tight text-ink-900">
              StockLedger
            </span>
          </div>

          <div className="mb-7">
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-brand-600">
              Welcome back
            </p>
            <h2 className="font-display text-[28px] font-bold leading-tight text-ink-900">
              Sign in to your workspace
            </h2>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-500">
              Pick up where your inventory left off.
            </p>
          </div>

          {serverError ? (
            <div
              className="mb-5 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-[12px] font-medium text-red-700"
              role="alert"
            >
              <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>{serverError}</span>
            </div>
          ) : null}

          <form onSubmit={onSubmit} noValidate className="space-y-4">
            <Field label="Email address" htmlFor="email" required error={errors.email?.message}>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@shop.com"
                invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? "email-error" : undefined}
                {...register("email")}
              />
            </Field>

            <Field
              label="Password"
              htmlFor="password"
              required
              error={errors.password?.message}
            >
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  className="pr-11"
                  invalid={Boolean(errors.password)}
                  aria-describedby={errors.password ? "password-error" : undefined}
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="absolute right-1 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? (
                    <EyeOff className="size-4" aria-hidden="true" />
                  ) : (
                    <Eye className="size-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </Field>

            <Button type="submit" size="lg" className="w-full" loading={isLoggingIn}>
              {isLoggingIn ? "Signing in…" : "Sign in"}
              {!isLoggingIn ? <ArrowRight className="size-4" aria-hidden="true" /> : null}
            </Button>
          </form>

          {import.meta.env.DEV ? (
            <div className="mt-7 rounded-xl border border-dashed border-ink-200 bg-surface/60 p-3.5">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-400">
                Demo accounts · development
              </p>
              <div className="mt-2 space-y-1.5">
                {DEMO_ACCOUNTS.map((account) => (
                  <button
                    key={account.email}
                    type="button"
                    onClick={() => {
                      setValue("email", account.email, { shouldValidate: true });
                      setValue("password", account.password, { shouldValidate: true });
                      setServerError(null);
                    }}
                    className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-[11px] text-ink-600 transition-colors hover:bg-ink-50"
                  >
                    <span className="font-semibold text-ink-800">{account.label}</span>
                    <span className="truncate text-ink-400">{account.email}</span>
                    <span className="ml-2 shrink-0 font-medium text-brand-700">Use</span>
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[10px] leading-relaxed text-ink-400">
                Demo credentials are development-only. Never use them in production.
              </p>
            </div>
          ) : null}

          <p className="mt-8 text-center text-[11px] leading-relaxed text-ink-400">
            Need an account? Ask your store owner to invite you.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
