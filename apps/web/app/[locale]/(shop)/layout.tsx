import { Suspense, type ReactNode } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileNav } from "@/components/layout/MobileNav";
import { GarageUrlSync } from "@/components/garage";

export default function ShopLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      {/* useSearchParams() (inside GarageUrlSync) requires a Suspense
          boundary or Next.js forces the whole route out of static
          rendering -- masterPlan.md §10 wants the landing route SSG. */}
      <Suspense fallback={null}>
        <GarageUrlSync />
      </Suspense>
      <Header />
      {/* pb reserves space for MobileNav's fixed bottom bar on mobile only. */}
      <div className="flex-1 pb-16 md:pb-0">{children}</div>
      <Footer />
      <MobileNav />
    </div>
  );
}
