import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CartPageContent, type CartPageMessages } from "@/components/cart/CartPageContent";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Cart");
  return {
    title: t("title"),
    // A shopper's own cart contents are per-session, not indexable content.
    robots: { index: false, follow: false },
  };
}

export default async function CartPage() {
  const t = await getTranslations("Cart");
  const messages: CartPageMessages = {
    title: t("title"),
    noPhoto: t("noPhoto"),
    emptyTitle: t("emptyTitle"),
    emptyDescription: t("emptyDescription"),
    browseCta: t("browseCta"),
    decreaseAria: t("decreaseAria"),
    increaseAria: t("increaseAria"),
    removeAria: t("removeAria"),
    stockIssue: t("stockIssue"),
    priceChanged: t("priceChanged"),
    wholesalePriceBadge: t("wholesalePriceBadge"),
    subtotalLabel: t("subtotalLabel"),
    discountLabel: t("discountLabel"),
    totalLabel: t("totalLabel"),
    couponPlaceholder: t("couponPlaceholder"),
    couponApplyButton: t("couponApplyButton"),
    couponApplyingButton: t("couponApplyingButton"),
    couponRemoveButton: t("couponRemoveButton"),
    continueToCheckout: t("continueToCheckout"),
    mutationError: t("mutationError"),
  };

  return (
    <main className="mx-auto max-w-container px-4 py-8">
      <CartPageContent messages={messages} />
    </main>
  );
}
