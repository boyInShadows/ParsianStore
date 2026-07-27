import { getTranslations } from "next-intl/server";
import { SectionShell } from "./SectionShell";

// Real 4-step layout (choose car -> find part -> confirm fitment -> receive)
// is P4.S5 content work (masterPlan.md §5 item 11).
export async function HowItWorks() {
  const t = await getTranslations("Landing.sections.howItWorks");

  return (
    <SectionShell id="how-it-works" code={t("code")} title={t("title")} subtitle={t("subtitle")} />
  );
}
