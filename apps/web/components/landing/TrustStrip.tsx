import { getTranslations } from "next-intl/server";
import { SectionShell } from "./SectionShell";

// Real trust-strip copy is authored (masterPlan.md §5 item 02); the
// hairline-separated four-item layout is P4.S4 content work.
export async function TrustStrip() {
  const t = await getTranslations("Landing.sections.trustStrip");

  return (
    <SectionShell id="trust-strip" code={t("code")} title={t("title")} subtitle={t("subtitle")} />
  );
}
