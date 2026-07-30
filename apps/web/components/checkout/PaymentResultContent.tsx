"use client"; // reads the gateway's own redirect query params, confirms the payment

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { confirmPayment } from "@/lib/fetchers/payments";
import { useCartStore } from "@/stores/cart-store";

export interface PaymentResultMessages {
  loading: string;
  successTitle: string;
  successDescription: string;
  failureTitle: string;
  failureDescription: string;
  invalidTitle: string;
  invalidDescription: string;
  orderCodeLabel: string;
  continueShoppingCta: string;
}

type Props = { messages: PaymentResultMessages };

type Outcome =
  | { kind: "loading" }
  | { kind: "invalid" }
  | { kind: "paid"; orderCode: string }
  | { kind: "failed"; orderCode: string };

// The payment gateway (or the mock, simulating one) redirects the real
// shopper's browser straight here -- checkout.service.ts's
// buildPaymentResultUrl is what points it at this exact page. This
// component's own fetch to GET /payments/callback is the one moment the
// payment is actually finalized; landing here is not itself proof of
// payment, only the trigger to go check.
export function PaymentResultContent({ messages }: Props) {
  const searchParams = useSearchParams();
  const [outcome, setOutcome] = useState<Outcome>({ kind: "loading" });
  const requested = useRef(false);

  useEffect(() => {
    if (requested.current) return;
    requested.current = true;

    const orderId = searchParams.get("orderId");
    const authority = searchParams.get("Authority");
    const status = searchParams.get("Status");
    if (!orderId || !authority || (status !== "OK" && status !== "NOK")) {
      // Deferred into a microtask rather than called synchronously in the
      // effect body -- same shape the real confirmPayment().then() branch
      // below already has, kept consistent rather than special-cased.
      void Promise.resolve().then(() => setOutcome({ kind: "invalid" }));
      return;
    }

    void confirmPayment({ orderId, authority, status }).then((result) => {
      if (!result.ok) {
        setOutcome({ kind: "invalid" });
        return;
      }
      if (result.data.status === "paid") {
        // The server just cleared this user's cart as part of finalizing
        // the payment -- force a refetch so the header badge and any
        // other cart-reading UI stop showing the now-stale pre-payment cart.
        void useCartStore.getState().load({ force: true });
        setOutcome({ kind: "paid", orderCode: result.data.orderCode });
        return;
      }
      setOutcome({ kind: "failed", orderCode: result.data.orderCode });
    });
    // Runs exactly once on mount (requested ref guards it), same pattern
    // use-auth-session.ts already established for a one-shot server call.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (outcome.kind === "loading") {
    return <p className="text-body-sm text-text-muted">{messages.loading}</p>;
  }

  if (outcome.kind === "invalid") {
    return (
      <div className="flex flex-col gap-3">
        <h1 className="font-display text-h2 font-black text-text">{messages.invalidTitle}</h1>
        <p className="text-body text-text-muted">{messages.invalidDescription}</p>
        <Link href="/" className="text-body-sm text-brand hover:underline">
          {messages.continueShoppingCta}
        </Link>
      </div>
    );
  }

  const isPaid = outcome.kind === "paid";

  return (
    <div className="flex flex-col gap-3">
      <h1 className="font-display text-h2 font-black text-text">
        {isPaid ? messages.successTitle : messages.failureTitle}
      </h1>
      <p className="text-body text-text-muted">
        {isPaid ? messages.successDescription : messages.failureDescription}
      </p>
      <p className="font-mono text-body text-text">
        {messages.orderCodeLabel}: {outcome.orderCode}
      </p>
      <Link href="/" className="text-body-sm text-brand hover:underline">
        {messages.continueShoppingCta}
      </Link>
    </div>
  );
}
