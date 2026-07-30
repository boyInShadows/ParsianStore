import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import {
  CheckoutPageContent,
  type CheckoutPageMessages,
} from "@/components/checkout/CheckoutPageContent";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Checkout");
  return {
    title: t("title"),
    // Auth-only, per-session cart contents -- not indexable, same
    // reasoning as the cart page itself.
    robots: { index: false, follow: false },
  };
}

export default async function CheckoutPage() {
  const t = await getTranslations("Checkout");
  const messages: CheckoutPageMessages = {
    title: t("title"),
    emptyCartTitle: t("emptyCartTitle"),
    emptyCartDescription: t("emptyCartDescription"),
    browseCta: t("browseCta"),
    submitError: t("submitError"),
    address: {
      title: t("address.title"),
      loading: t("address.loading"),
      emptyHint: t("address.emptyHint"),
      addNew: t("address.addNew"),
      cancel: t("address.cancel"),
      provinceLabel: t("address.provinceLabel"),
      cityLabel: t("address.cityLabel"),
      selectPlaceholder: t("address.selectPlaceholder"),
      lineLabel: t("address.lineLabel"),
      postalCodeLabel: t("address.postalCodeLabel"),
      plateLabel: t("address.plateLabel"),
      unitLabel: t("address.unitLabel"),
      receiverNameLabel: t("address.receiverNameLabel"),
      receiverPhoneLabel: t("address.receiverPhoneLabel"),
      saveButton: t("address.saveButton"),
      savingButton: t("address.savingButton"),
      radioGroupLabel: t("address.radioGroupLabel"),
    },
    shipping: {
      title: t("shipping.title"),
      loading: t("shipping.loading"),
      emptyHint: t("shipping.emptyHint"),
      errorHint: t("shipping.errorHint"),
      radioGroupLabel: t("shipping.radioGroupLabel"),
    },
    summary: {
      title: t("summary.title"),
      subtotalLabel: t("summary.subtotalLabel"),
      shippingLabel: t("summary.shippingLabel"),
      shippingPending: t("summary.shippingPending"),
      totalLabel: t("summary.totalLabel"),
      placeOrderButton: t("summary.placeOrderButton"),
      placingOrderButton: t("summary.placingOrderButton"),
      incompleteHint: t("summary.incompleteHint"),
    },
  };

  return (
    <main className="mx-auto max-w-container px-4 py-8">
      <CheckoutPageContent messages={messages} />
    </main>
  );
}
