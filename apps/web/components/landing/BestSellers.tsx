import { getTranslations } from "next-intl/server";
import { SectionShell } from "./SectionShell";

// Real product grid (horizontal snap-scroll on mobile, fitment chip when a
// garage vehicle is active) is P4.S4 content work against the real
// catalog API (masterPlan.md §5 item 04).
export async function BestSellers() {
  const t = await getTranslations("Landing.sections.bestSellers");

  return (
    <SectionShell id="best-sellers" code={t("code")} title={t("title")} subtitle={t("subtitle")} />
  );
}
