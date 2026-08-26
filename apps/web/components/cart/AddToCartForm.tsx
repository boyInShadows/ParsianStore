"use client"; // qty state + calls the cart store

import { useState } from "react";
import { useCartStore } from "@/stores/cart-store";
import { useToastStore } from "@/stores/toast-store";
import { Button } from "@/components/primitives";

export interface AddToCartFormMessages {
  qtyLabel: string;
  addButton: string;
  addingButton: string;
  addedToast: string;
  errorToast: string;
}

type Props = {
  productId: string;
  inStock: boolean;
  variants?: Array<{ id: string; name: { fa: string; en: string }; stock: number }>;
  messages: AddToCartFormMessages;
};

// The existing in-stock/out-of-stock line on the PDP already covers the
// out-of-stock message -- this form simply doesn't render when there's
// nothing to add, rather than duplicating that text.
export function AddToCartForm({ productId, inStock, variants = [], messages }: Props) {
  const [qty, setQty] = useState(1);
  const [variantId, setVariantId] = useState(
    variants.find((variant) => variant.stock > 0)?.id ?? "",
  );
  const [pending, setPending] = useState(false);
  const addItem = useCartStore((state) => state.addItem);
  const showToast = useToastStore((state) => state.show);

  if (!inStock) return null;

  async function handleAdd(): Promise<void> {
    setPending(true);
    const ok = await addItem(productId, qty, variantId || undefined);
    setPending(false);
    showToast(ok ? messages.addedToast : messages.errorToast, ok ? "success" : "danger");
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {variants.length > 0 ? (
        <select
          aria-label="گونه محصول"
          value={variantId}
          onChange={(event) => setVariantId(event.target.value)}
          className="rounded-md border border-border bg-surface px-3 py-2 text-body-sm"
        >
          {variants.map((variant) => (
            <option key={variant.id} value={variant.id} disabled={variant.stock < 1}>
              {variant.name.fa}
              {variant.stock < 1 ? " (ناموجود)" : ""}
            </option>
          ))}
        </select>
      ) : null}
      <label className="sr-only" htmlFor="add-to-cart-qty">
        {messages.qtyLabel}
      </label>
      <input
        id="add-to-cart-qty"
        type="number"
        min={1}
        value={qty}
        onChange={(event) => setQty(Math.max(1, Number(event.target.value) || 1))}
        className="w-16 rounded-md border border-border bg-surface px-2 py-2 text-center text-body-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      />
      <Button
        type="button"
        variant="cta"
        onClick={() => void handleAdd()}
        disabled={pending || (variants.length > 0 && !variantId)}
      >
        {pending ? messages.addingButton : messages.addButton}
      </Button>
    </div>
  );
}
