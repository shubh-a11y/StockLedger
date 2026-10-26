import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowDownToLine,
  ArrowUpFromLine,
  CornerDownLeft,
  PackagePlus,
  TriangleAlert
} from "lucide-react";
import type { Product, RecordMovementInput, Role } from "../../types";
import { api, ApiRequestError, fieldErrorsOf } from "../../lib/api";
import { cn, formatNumber, MOVEMENT_META } from "../../lib/utils";
import { useToast } from "../ui/toast";
import { Modal } from "../ui/dialog";
import { Button } from "../ui/button";
import { Field, Input, Textarea } from "../ui/input";
import { Select } from "../ui/select";

export type MovementKind = "purchase" | "sale" | "return" | "adjustment";

const KIND_OPTIONS: Array<{
  kind: MovementKind;
  label: string;
  description: string;
  icon: typeof PackagePlus;
}> = [
  {
    kind: "purchase",
    label: "Purchase",
    description: "Stock received from a supplier",
    icon: PackagePlus
  },
  {
    kind: "sale",
    label: "Sale",
    description: "Stock sold to a customer",
    icon: ArrowUpFromLine
  },
  {
    kind: "return",
    label: "Customer return",
    description: "Stock coming back in",
    icon: CornerDownLeft
  },
  {
    kind: "adjustment",
    label: "Adjustment",
    description: "Correct stock in or out",
    icon: ArrowDownToLine
  }
];

function allowedKinds(role: Role): MovementKind[] {
  return role === "OWNER" ? ["purchase", "sale", "return", "adjustment"] : ["sale", "return"];
}

const movementFormSchema = z.object({
  productId: z.string().min(1, "Choose a product."),
  quantity: z
    .string()
    .trim()
    .min(1, "Enter a quantity.")
    .regex(/^\d+$/, "Quantity must be a whole number.")
    .refine((value) => Number(value) > 0, "Quantity must be greater than zero.")
    .refine((value) => Number(value) <= 1_000_000, "Quantity is too large."),
  reason: z
    .string()
    .trim()
    .min(3, "Add a short reason (at least 3 characters).")
    .max(500, "Reason is too long."),
  reference: z.string().trim().max(120, "Reference is too long.").optional(),
  direction: z.enum(["IN", "OUT"])
});

type MovementFormValues = z.infer<typeof movementFormSchema>;

function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `sl-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

interface MovementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: Role;
  defaultProductId?: string;
  defaultKind?: MovementKind;
}

export function MovementDialog({
  open,
  onOpenChange,
  role,
  defaultProductId,
  defaultKind
}: MovementDialogProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const kinds = allowedKinds(role);
  const [kind, setKind] = useState<MovementKind>(
    defaultKind && kinds.includes(defaultKind) ? defaultKind : kinds[0] ?? "sale"
  );
  const [serverError, setServerError] = useState<string | null>(null);
  const keyRef = useRef<string | null>(null);
  const fingerprintRef = useRef<string | null>(null);

  const productsQuery = useQuery({
    queryKey: ["products", "selector"],
    queryFn: () => api.products.list({ pageSize: 100, sort: "name", order: "asc" }),
    enabled: open,
    staleTime: 10_000
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    setError,
    formState: { errors, isSubmitting }
  } = useForm<MovementFormValues>({
    resolver: zodResolver(movementFormSchema),
    defaultValues: {
      productId: defaultProductId ?? "",
      quantity: "",
      reason: "",
      reference: "",
      direction: "IN"
    }
  });

  useEffect(() => {
    if (!open) return;
    const nextKind = defaultKind && kinds.includes(defaultKind) ? defaultKind : kinds[0] ?? "sale";
    setKind(nextKind);
    setServerError(null);
    keyRef.current = null;
    fingerprintRef.current = null;
    reset({
      productId: defaultProductId ?? "",
      quantity: "",
      reason: "",
      reference: "",
      direction: "IN"
    });
    // kinds is derived from role and stable for a session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultProductId, defaultKind, reset]);

  const selectedProductId = watch("productId");
  const products = productsQuery.data?.items ?? [];
  const selectedProduct: Product | undefined = products.find(
    (product) => product.id === selectedProductId
  );

  const mutation = useMutation({
    mutationFn: ({ kind: movementKind, input }: { kind: MovementKind; input: RecordMovementInput }) =>
      api.movements.record(movementKind, input)
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    const quantity = Number(values.quantity);
    const payloadFingerprint = JSON.stringify({
      kind,
      productId: values.productId,
      quantity,
      reason: values.reason.trim(),
      reference: values.reference?.trim() ?? "",
      direction: values.direction
    });

    if (!keyRef.current || fingerprintRef.current !== payloadFingerprint) {
      keyRef.current = newIdempotencyKey();
      fingerprintRef.current = payloadFingerprint;
    }

    const input: RecordMovementInput = {
      productId: values.productId,
      quantity,
      reason: values.reason.trim(),
      reference: values.reference?.trim() || undefined,
      idempotencyKey: keyRef.current,
      ...(kind === "adjustment" ? { direction: values.direction } : {})
    };

    try {
      const result = await mutation.mutateAsync({ kind, input });
      keyRef.current = null;
      fingerprintRef.current = null;

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["products"] }),
        queryClient.invalidateQueries({ queryKey: ["product"] }),
        queryClient.invalidateQueries({ queryKey: ["movements"] }),
        queryClient.invalidateQueries({ queryKey: ["reports"] })
      ]);

      toast({
        title: result.replayed ? "Movement already recorded" : "Movement recorded",
        description: result.replayed
          ? "This retry matched an existing entry and was not duplicated."
          : `${MOVEMENT_META[result.movement.type].label} · ${result.movement.product.name}. New stock: ${formatNumber(result.balance)} ${result.movement.product.unit}.`,
        variant: "success"
      });
      onOpenChange(false);
    } catch (error) {
      const fieldErrors = fieldErrorsOf(error);
      (["productId", "quantity", "reason", "reference"] as const).forEach((field) => {
        const message = fieldErrors[field]?.[0];
        if (message) setError(field, { message });
      });

      if (error instanceof ApiRequestError && error.code === "INSUFFICIENT_STOCK") {
        const available = error.details?.availableStock;
        setServerError(
          typeof available === "number"
            ? `Not enough stock. The ledger shows ${formatNumber(available)} units available right now.`
            : error.message
        );
        return;
      }

      setServerError(
        error instanceof ApiRequestError
          ? error.message
          : "We could not record this movement. Please try again."
      );
    }
  });

  const productOptions = products.map((product) => ({
    value: product.id,
    label: `${product.name} · ${product.sku} (${formatNumber(product.stock)} ${product.unit})`
  }));

  const selectedMeta = KIND_OPTIONS.find((option) => option.kind === kind);
  const isOutgoing = kind === "sale" || (kind === "adjustment" && watch("direction") === "OUT");
  const estimatedStock = selectedProduct?.stock;

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Record stock movement"
      description="The server calculates the balance inside a locked transaction. Stock is never edited directly."
      size="lg"
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="movement-form"
            loading={isSubmitting || mutation.isPending}
            disabled={products.length === 0}
          >
            Record {selectedMeta?.label.toLowerCase() ?? "movement"}
          </Button>
        </>
      }
    >
      <form id="movement-form" onSubmit={onSubmit} noValidate className="space-y-4">
        {serverError ? (
          <div
            className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-[12px] text-red-700"
            role="alert"
          >
            <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            {serverError}
          </div>
        ) : null}

        <fieldset>
          <legend className="mb-2 text-[12px] font-semibold text-ink-700">Movement type</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {KIND_OPTIONS.filter((option) => kinds.includes(option.kind)).map((option) => (
              <label
                key={option.kind}
                className={cn(
                  "flex cursor-pointer flex-col gap-1 rounded-lg border p-2.5 transition-colors",
                  kind === option.kind
                    ? "border-brand-400 bg-brand-50/70 ring-1 ring-brand-400/40"
                    : "border-line bg-surface hover:border-ink-300"
                )}
              >
                <input
                  type="radio"
                  name="movement-kind"
                  value={option.kind}
                  checked={kind === option.kind}
                  onChange={() => {
                    setKind(option.kind);
                    setServerError(null);
                  }}
                  className="sr-only"
                />
                <option.icon
                  className={cn(
                    "size-4",
                    kind === option.kind ? "text-brand-600" : "text-ink-400"
                  )}
                  aria-hidden="true"
                />
                <span className="text-[12px] font-semibold text-ink-900">{option.label}</span>
                <span className="text-[10px] leading-snug text-ink-500">{option.description}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {productsQuery.isError ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
            Could not load products. Close this dialog and try again.
          </p>
        ) : null}

        <Field label="Product" htmlFor="movement-product" required error={errors.productId?.message}>
          <Select
            id="movement-product"
            ariaLabel="Product"
            value={selectedProductId}
            onValueChange={(value) => {
              setValue("productId", value, { shouldValidate: true });
              setServerError(null);
            }}
            options={productOptions}
            placeholder={productsQuery.isPending ? "Loading products…" : "Choose a product"}
            disabled={productsQuery.isPending || products.length === 0}
          />
        </Field>

        {products.length === 0 && !productsQuery.isPending ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
            There are no active products yet. An owner needs to create a product before stock can
            move.
          </p>
        ) : null}

        {selectedProduct ? (
          <div
            className={cn(
              "flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5",
              isOutgoing && estimatedStock !== undefined && estimatedStock <= 0
                ? "border-amber-200 bg-amber-50"
                : "border-line bg-ink-50/60"
            )}
          >
            <div className="flex items-center gap-2 text-[11px] text-ink-600">
              {isOutgoing && estimatedStock !== undefined && estimatedStock <= 0 ? (
                <TriangleAlert className="size-3.5 text-amber-600" aria-hidden="true" />
              ) : null}
              Estimate at open
            </div>
            <p className="text-[12px] font-semibold text-ink-900">
              {formatNumber(estimatedStock ?? 0)} {selectedProduct.unit} available
            </p>
          </div>
        ) : null}

        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field
            label="Quantity"
            htmlFor="quantity"
            required
            hint={selectedProduct ? `Counted in ${selectedProduct.unit}s` : "Positive whole number"}
            error={errors.quantity?.message}
          >
            <Input
              id="quantity"
              inputMode="numeric"
              placeholder="E.g. 10"
              invalid={Boolean(errors.quantity)}
              {...register("quantity")}
            />
          </Field>

          <Field
            label="Reference"
            htmlFor="reference"
            hint="Optional order, receipt or ticket."
            error={errors.reference?.message}
          >
            <Input
              id="reference"
              placeholder="E.g. PO-1042"
              invalid={Boolean(errors.reference)}
              {...register("reference")}
            />
          </Field>
        </div>

        {kind === "adjustment" ? (
          <fieldset className="rounded-lg border border-line bg-surface px-3 py-2.5">
            <legend className="px-1 text-[12px] font-semibold text-ink-700">
              Adjustment direction
            </legend>
            <div className="mt-1 grid gap-2 sm:grid-cols-2">
              {[
                { value: "IN" as const, label: "Increase stock", hint: "Found extra units" },
                { value: "OUT" as const, label: "Decrease stock", hint: "Damage, loss or correction" }
              ].map((option) => (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-start gap-2 rounded-md border border-line px-2.5 py-2 text-[12px] transition-colors hover:bg-ink-50 has-[:checked]:border-brand-300 has-[:checked]:bg-brand-50/60"
                >
                  <input
                    type="radio"
                    value={option.value}
                    className="mt-0.5 accent-brand-600"
                    {...register("direction")}
                  />
                  <span>
                    <span className="block font-semibold text-ink-800">{option.label}</span>
                    <span className="block text-[10px] text-ink-500">{option.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}

        <Field label="Reason" htmlFor="reason" required error={errors.reason?.message}>
          <Textarea
            id="reason"
            placeholder="What happened? E.g. weekly supplier delivery"
            invalid={Boolean(errors.reason)}
            rows={2}
            {...register("reason")}
          />
        </Field>

        <p className="text-[11px] leading-relaxed text-ink-400">
          Retries are safe: this form generates an idempotency key so a repeated submission cannot
          create a duplicate movement.
        </p>
      </form>
    </Modal>
  );
}
