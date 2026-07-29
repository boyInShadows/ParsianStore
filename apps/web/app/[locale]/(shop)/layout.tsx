import { Suspense, type ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { Header, type HeaderMessages } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileNav } from "@/components/layout/MobileNav";
import { GarageUrlSync } from "@/components/garage";
import { AuthSession } from "@/components/auth";
import { Toaster } from "@/components/primitives";

export default async function ShopLayout({ children }: { children: ReactNode }) {
  // Header is a Client Component (needs interactive menus/modals) but
  // pre-translated strings are threaded down as props rather than calling
  // next-intl's client hook inside it -- same pattern FitmentBanner/PDP
  // already use, kept for the same route-JS-budget reason (P4.S4).
  const t = await getTranslations("Header");
  const headerMessages: HeaderMessages = {
    signInAria: t("signInAria"),
    signedInAria: t("signedInAria"),
    signOutAria: t("signOutAria"),
  };

  return (
    <div className="flex min-h-screen flex-col">
      {/* useSearchParams() (inside GarageUrlSync) requires a Suspense
          boundary or Next.js forces the whole route out of static
          rendering -- masterPlan.md §10 wants the landing route SSG. */}
      <Suspense fallback={null}>
        <GarageUrlSync />
      </Suspense>
      <AuthSession />
      <Header messages={headerMessages} />
      {/* pb reserves space for MobileNav's fixed bottom bar on mobile only. */}
      <div className="flex-1 pb-16 md:pb-0">{children}</div>
      <Footer />
      <MobileNav />
      <Toaster />
    </div>
  );
}
