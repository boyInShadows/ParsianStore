import { getTranslations } from "next-intl/server";
import { SectionShell } from "./SectionShell";

// Real links into /vehicle/[make]/[model] landing pages, sourced from the
// real P2.S6 vehicle tree (Saipa + Iran Khodro only) -- P4.S5 content work
// (masterPlan.md §5 item 08, §10 SEO: these pages are the primary organic
// surface).
export async function ShopByVehicle() {
  const t = await getTranslations("Landing.sections.shopByVehicle");

  return (
    <SectionShell
      id="shop-by-vehicle"
      code={t("code")}
      title={t("title")}
      subtitle={t("subtitle")}
    />
  );
}
