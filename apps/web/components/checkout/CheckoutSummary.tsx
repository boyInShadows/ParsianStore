"use client"; // reads the live cart store for the money figures

import { formatToman } from "schemas";
import { Button } from "@/components/primitives";
import { useCartStore } from "@/stores/cart-store";

export interface CheckoutSummaryMessages {
  title: string;
  subtotalLabel: string;
  discountLabel: string;
  shippingLabel: string;
  shippingPending: string;
  totalLabel: string;
  placeOrderButton: string;
  placingOrderButton: string;
  incompleteHint: string;
}

type Props = {
  shippingRial: number | null;
  canSubmit: boolean;
  submitting: boolean;
  onSubmit: () => void;
  messages: CheckoutSummaryMessages;
};

// §3.6: "cart totals recomputed server-side at every step" -- this total
// is a display-only preview of what POST /checkout/initiate will itself
// compute and persist onto the real Order; it's never sent as-is.
export function CheckoutSummary({
  shippingRial,
  canSubmit,
  submitting,
  onSubmit,
  messages,
}: Props) {
  const cart = useCartStore((state) => state.cart);
  const subtotalRial = cart?.subtotalRial ?? 0;
  const discountRial = cart?.discountRial ?? 0;
  // checkout.service.ts's own formula: subtotal - discount + shipping.
  // cart.totalRial (from cart.service.ts's getCart()) already has the
  // discount subtracted -- shipping is the only piece added here.
  const totalRial = (cart?.totalRial ?? subtotalRial) + (shippingRial ?? 0);

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border bg-surface-sunken p-4 shadow-sm sm:p-6">
      <h2 className="border-b border-rule pb-3 text-h3 font-bold text-text">{messages.title}</h2>
      <div className="flex items-center justify-between text-body-sm text-text">
        <span>{messages.subtotalLabel}</span>
        <span className="font-mono">{formatToman(subtotalRial)}</span>
      </div>
      {discountRial > 0 ? (
        // text-success fails WCAG AA at this text size (same bug class
        // already documented/fixed in ProductCard.tsx, P5.S1) -- the
        // leading minus sign already conveys "discount."
        <div className="flex items-center justify-between text-body-sm text-text">
          <span className="text-text-muted">{messages.discountLabel}</span>
          <span className="font-mono">-{formatToman(discountRial)}</span>
        </div>
      ) : null}
      <div className="flex items-center justify-between text-body-sm text-text">
        <span>{messages.shippingLabel}</span>
        <span className="font-mono">
          {shippingRial === null ? messages.shippingPending : formatToman(shippingRial)}
        </span>
      </div>
      <div className="flex items-center justify-between border-t border-border pt-3 text-body font-medium text-text">
        <span>{messages.totalLabel}</span>
        <span className="font-mono text-h3 font-black text-price">{formatToman(totalRial)}</span>
      </div>
      <Button type="button" variant="cta" disabled={!canSubmit || submitting} onClick={onSubmit}>
        {submitting ? messages.placingOrderButton : messages.placeOrderButton}
      </Button>
      {!canSubmit ? (
        <p className="text-body-sm text-text-muted">{messages.incompleteHint}</p>
      ) : null}
    </section>
  );
}
