import { Suspense, type ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { Header, type HeaderMessages } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileNav } from "@/components/layout/MobileNav";
import { GarageUrlSync } from "@/components/garage";
import { AuthSession } from "@/components/auth";
import { CartSession } from "@/components/cart";
import { Toaster } from "@/components/primitives";
import { RevealBoot } from "@/components/motion";

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
    themeToggleAria: t("themeToggleAria"),
  };

  return (
    // `pb-16` (64px) clears MobileNav's 59px fixed bottom bar, on the OUTER
    // wrapper rather than on the content div. It sat on the content div until
    // P14.S6, which reserved room below the page but none below the FOOTER --
    // and the footer is outside that div, so its last 64px lived under the
    // bar. Nobody noticed while the mobile footer was ~1500px of link columns
    // and the thing being covered was empty space; collapsing it to 537px put
    // the copyright line there.
    <div className="flex min-h-screen flex-col pb-16 md:pb-0">
      {/* First, and it has to stay first: it opts the document into the hidden
          pre-reveal state before any `[data-reveal]` element is parsed, so
          those elements' first paint is already the right one. Rendered later
          they would paint visible and then be hidden -- the flash masterPlan.md
          §6.7 forbids. It arms nothing on a page with no reveals, and its own
          watchdog disarms if hydration never signals. */}
      <RevealBoot />
      {/* useSearchParams() (inside GarageUrlSync) requires a Suspense
          boundary or Next.js forces the whole route out of static
          rendering -- masterPlan.md §10 wants the landing route SSG. */}
      <Suspense fallback={null}>
        <GarageUrlSync />
      </Suspense>
      <AuthSession />
      <CartSession />
      <Header messages={headerMessages} />
      <div className="flex-1">{children}</div>
      <Footer />
      <MobileNav />
      <Toaster />
    </div>
  );
}
