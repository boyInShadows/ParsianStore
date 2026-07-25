import type { ReactNode } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileNav } from "@/components/layout/MobileNav";

export default function ShopLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      {/* pb reserves space for MobileNav's fixed bottom bar on mobile only. */}
      <div className="flex-1 pb-16 md:pb-0">{children}</div>
      <Footer />
      <MobileNav />
    </div>
  );
}
