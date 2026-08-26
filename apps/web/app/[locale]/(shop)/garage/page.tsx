import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AccountNav } from "@/components/account/AccountNav";
import { GarageContent, type GarageMessages } from "@/components/garage/GarageContent";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Garage");
  return {
    title: t("title"),
    // A shopper's own saved vehicles are private, per-session data --
    // not indexable, same reasoning as /cart, /orders, /addresses,
    // /wishlist -- even though this page itself needs no auth (the
    // garage is guest-accessible, masterPlan.md §3.4).
    robots: { index: false, follow: false },
  };
}

export default async function GaragePage() {
  const t = await getTranslations("Garage");

  const messages: GarageMessages = {
    title: t("title"),
    itemCount: t("itemCount"),
    emptyTitle: t("emptyTitle"),
    emptyDescription: t("emptyDescription"),
    activeBadge: t("activeBadge"),
    setActiveButton: t("setActiveButton"),
    removeAria: t("removeAria"),
    addVehicleButton: t("addVehicleButton"),
    cancel: t("cancel"),
  };

  return (
    <main className="mx-auto max-w-container px-4 py-8">
      <AccountNav active="garage" />
      <div className="mt-6">
        <GarageContent messages={messages} />
      </div>
    </main>
  );
}
