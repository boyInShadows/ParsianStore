import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import {
  PaymentResultContent,
  type PaymentResultMessages,
} from "@/components/checkout/PaymentResultContent";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Checkout.result");
  return {
    title: t("successTitle"),
    robots: { index: false, follow: false },
  };
}

export default async function CheckoutResultPage() {
  const t = await getTranslations("Checkout.result");
  const messages: PaymentResultMessages = {
    loading: t("loading"),
    successTitle: t("successTitle"),
    successDescription: t("successDescription"),
    failureTitle: t("failureTitle"),
    failureDescription: t("failureDescription"),
    invalidTitle: t("invalidTitle"),
    invalidDescription: t("invalidDescription"),
    orderCodeLabel: t("orderCodeLabel"),
    continueShoppingCta: t("continueShoppingCta"),
  };

  return (
    <main className="mx-auto max-w-md px-4 py-16">
      {/* useSearchParams() inside PaymentResultContent needs a Suspense
          boundary, same requirement LoginForm has for its own ?next=. */}
      <Suspense fallback={null}>
        <PaymentResultContent messages={messages} />
      </Suspense>
    </main>
  );
}
