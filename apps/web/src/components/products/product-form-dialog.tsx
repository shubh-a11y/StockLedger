import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle } from "lucide-react";
import type { Product, ProductInput } from "../../types";
import { api, ApiRequestError, fieldErrorsOf } from "../../lib/api";
import { useToast } from "../ui/toast";
import { Modal } from "../ui/dialog";
import { Button } from "../ui/button";
import { Field, Input } from "../ui/input";

const productFormSchema = z.object({
  sku: z
    .string()
    .trim()
    .min(2, "SKU must be at least 2 characters.")
    .max(40, "SKU must be 40 characters or fewer.")
    .regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/, "Use letters, numbers, dots, dashes or underscores."),
  name: z.string().trim().min(1, "Enter a product name.").max(120, "Name is too long."),
  category: z.string().trim().min(1, "Enter a category.").max(60, "Category is too long."),
  unit: z.string().trim().min(1, "Enter a unit.").max(20, "Unit is too long."),
  price: z
    .string()
    .trim()
    .min(1, "Enter a price.")
    .regex(/^\d+(\.\d{1,2})?$/, "Use a number with at most two decimal places."),
  lowStockThreshold: z
    .string()
    .trim()
    .min(1, "Enter a threshold.")
    .regex(/^\d+$/, "Threshold must be a whole number.")
    .refine((value) => Number(value) <= 1_000_000, "Threshold is too large.")
});

type ProductFormValues = z.infer<typeof productFormSchema>;

const EMPTY_DEFAULTS: ProductFormValues = {
  sku: "",
  name: "",
  category: "",
  unit: "piece",
  price: "",
  lowStockThreshold: "5"
};

function toDefaults(product: Product | null): ProductFormValues {
  if (!product) return EMPTY_DEFAULTS;
  return {
    sku: product.sku,
    name: product.name,
    category: product.category,
    unit: product.unit,
    price: product.price,
    lowStockThreshold: String(product.lowStockThreshold)
  };
}

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
  categories?: string[];
}

export function ProductFormDialog({
  open,
  onOpenChange,
  product = null,
  categories = []
}: ProductFormDialogProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [serverError, setServerError] = useState<string | null>(null);
  const isEditing = Boolean(product);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting }
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: toDefaults(product)
  });

  useEffect(() => {
    if (open) {
      reset(toDefaults(product));
      setServerError(null);
    }
  }, [open, product, reset]);

  const mutation = useMutation({
    mutationFn: (input: ProductInput) =>
      product ? api.products.update(product.id, input) : api.products.create(input)
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    const input: ProductInput = {
      sku: values.sku.trim().toUpperCase(),
      name: values.name.trim(),
      category: values.category.trim(),
      unit: values.unit.trim(),
      price: Number(values.price),
      lowStockThreshold: Number(values.lowStockThreshold)
    };

    try {
      const result = await mutation.mutateAsync(input);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["products"] }),
        queryClient.invalidateQueries({ queryKey: ["product"] }),
        queryClient.invalidateQueries({ queryKey: ["reports"] })
      ]);
      toast({
        title: isEditing ? "Product updated" : "Product created",
        description: `${result.product.name} (${result.product.sku}) is ready.`,
        variant: "success"
      });
      onOpenChange(false);
    } catch (error) {
      const fieldErrors = fieldErrorsOf(error);
      let mapped = false;
      (["sku", "name", "category", "unit", "price", "lowStockThreshold"] as const).forEach(
        (field) => {
          const message = fieldErrors[field]?.[0];
          if (message) {
            setError(field, { message });
            mapped = true;
          }
        }
      );

      if (error instanceof ApiRequestError && error.code === "DUPLICATE_SKU") {
        setError("sku", { message: "This SKU is already in use." });
        mapped = true;
      }

      if (!mapped) {
        setServerError(
          error instanceof ApiRequestError
            ? error.message
            : "We could not save this product. Please try again."
        );
      }
    }
  });

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? "Edit product" : "New product"}
      description={
        isEditing
          ? "Update the product metadata. Stock is never edited here — it comes from movements."
          : "Add a product to the catalogue. It starts with zero stock until a movement is recorded."
      }
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="product-form" loading={isSubmitting || mutation.isPending}>
            {isEditing ? "Save changes" : "Create product"}
          </Button>
        </>
      }
    >
      <form id="product-form" onSubmit={onSubmit} noValidate className="space-y-3.5">
        {serverError ? (
          <div
            className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700"
            role="alert"
          >
            <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            {serverError}
          </div>
        ) : null}

        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field label="SKU" htmlFor="sku" required error={errors.sku?.message}>
            <Input
              id="sku"
              placeholder="E.g. ELEC-004"
              autoComplete="off"
              invalid={Boolean(errors.sku)}
              {...register("sku")}
            />
          </Field>
          <Field label="Product name" htmlFor="name" required error={errors.name?.message}>
            <Input
              id="name"
              placeholder="E.g. Wireless Mouse"
              invalid={Boolean(errors.name)}
              {...register("name")}
            />
          </Field>
          <Field label="Category" htmlFor="category" required error={errors.category?.message}>
            <Input
              id="category"
              list="category-suggestions"
              placeholder="E.g. Electronics"
              invalid={Boolean(errors.category)}
              {...register("category")}
            />
            <datalist id="category-suggestions">
              {categories.map((category) => (
                <option key={category} value={category} />
              ))}
            </datalist>
          </Field>
          <Field
            label="Unit of measurement"
            htmlFor="unit"
            required
            hint="How this product is counted, e.g. piece, pack, kg."
            error={errors.unit?.message}
          >
            <Input
              id="unit"
              placeholder="piece"
              invalid={Boolean(errors.unit)}
              {...register("unit")}
            />
          </Field>
          <Field label="Price (USD)" htmlFor="price" required error={errors.price?.message}>
            <Input
              id="price"
              inputMode="decimal"
              placeholder="0.00"
              invalid={Boolean(errors.price)}
              {...register("price")}
            />
          </Field>
          <Field
            label="Low-stock threshold"
            htmlFor="lowStockThreshold"
            required
            hint="Alert when stock is at or below this number."
            error={errors.lowStockThreshold?.message}
          >
            <Input
              id="lowStockThreshold"
              inputMode="numeric"
              placeholder="5"
              invalid={Boolean(errors.lowStockThreshold)}
              {...register("lowStockThreshold")}
            />
          </Field>
        </div>

        <p className="rounded-lg border border-line bg-ink-50/60 px-3 py-2 text-[11px] leading-relaxed text-ink-500">
          Need to change stock? Record a purchase, sale, return or adjustment instead. The ledger
          is always the source of truth.
        </p>
      </form>
    </Modal>
  );
}
