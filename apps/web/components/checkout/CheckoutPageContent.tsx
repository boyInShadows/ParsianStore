"use client"; // orchestrates the address/shipping/summary flow + auth gate + submission

import { useEffect, useState } from "react";
import type { AddressDto, ShippingOptionDto } from "schemas";
import { useRouter, Link } from "@/i18n/navigation";
import { EmptyState } from "@/components/primitives";
import { initiateCheckout } from "@/lib/fetchers/checkout";
import { useAuthStore } from "@/stores/auth-store";
import { useCartStore } from "@/stores/cart-store";
import { AddressPicker, type AddressPickerMessages } from "./AddressPicker";
import { ShippingPicker, type ShippingPickerMessages } from "./ShippingPicker";
import { CheckoutSummary, type CheckoutSummaryMessages } from "./CheckoutSummary";

export interface CheckoutPageMessages {
  title: string;
  emptyCartTitle: string;
  emptyCartDescription: string;
  browseCta: string;
  submitError: string;
  address: AddressPickerMessages;
  shipping: ShippingPickerMessages;
  summary: CheckoutSummaryMessages;
}

type Props = { messages: CheckoutPageMessages };

export function CheckoutPageContent({ messages }: Props) {
  const router = useRouter();
  const authStatus = useAuthStore((state) => state.status);
  const cart = useCartStore((state) => state.cart);
  const cartStatus = useCartStore((state) => state.status);

  const [address, setAddress] = useState<AddressDto | null>(null);
  const [shippingOption, setShippingOption] = useState<ShippingOptionDto | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Checkout is auth-only (P6.S2's own decision, applied throughout
  // Phase 6) -- use-auth-session.ts already resolved this to a real
  // status before this page could be interacted with; "idle"/"loading"
  // is the brief window before that resolves, same as CartPageContent's
  // own null-render for its own loading window.
  useEffect(() => {
    if (authStatus === "guest") {
      router.push("/auth/login?next=/checkout");
    }
  }, [authStatus, router]);

  function handleSelectAddress(selected: AddressDto): void {
    setAddress(selected);
    setShippingOption(null);
  }

  async function handleSubmit(): Promise<void> {
    if (!address || !shippingOption) return;
    setSubmitting(true);
    setSubmitError(null);
    const result = await initiateCheckout({
      addressId: address.id,
      shippingMethodCode: shippingOption.methodCode,
    });
    if (!result.ok) {
      setSubmitting(false);
      setSubmitError(result.message);
      return;
    }
    // Full navigation, not router.push -- redirectUrl is a real payment
    // gateway URL (or the mock's equivalent), not an in-app route.
    window.location.href = result.data.redirectUrl;
  }

  if (authStatus === "idle" || authStatus === "loading" || authStatus === "guest") return null;
  if (cartStatus === "idle" || cartStatus === "loading") return null;

  if (!cart || cart.items.length === 0) {
    return (
      <EmptyState
        titleAs="h1"
        title={messages.emptyCartTitle}
        description={messages.emptyCartDescription}
        action={
          <Link href="/" className="text-body-sm text-brand hover:underline">
            {messages.browseCta}
          </Link>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-display text-h2 font-black text-text">{messages.title}</h1>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-8">
          <AddressPicker
            selectedId={address?.id ?? null}
            onSelect={handleSelectAddress}
            messages={messages.address}
          />
          {address ? (
            <ShippingPicker
              key={address.id}
              addressId={address.id}
              selectedCode={shippingOption?.methodCode ?? null}
              onSelect={setShippingOption}
              messages={messages.shipping}
            />
          ) : null}
        </div>

        <div className="flex flex-col gap-3">
          <CheckoutSummary
            shippingRial={shippingOption?.priceRial ?? null}
            canSubmit={Boolean(address && shippingOption)}
            submitting={submitting}
            onSubmit={() => void handleSubmit()}
            messages={messages.summary}
          />
          {submitError ? (
            <p role="alert" className="text-body-sm text-danger">
              {submitError}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
