import { getTranslations } from "next-intl/server";
import { SectionShell } from "./SectionShell";

// Real phone/WhatsApp numbers and working hours are a business detail not
// yet finalized (Footer.tsx's own tel: link is the same honest all-zero
// placeholder pending real contact info) -- P4.S5 content work
// (masterPlan.md §5 item 13).
export async function Support() {
  const t = await getTranslations("Landing.sections.support");

  return <SectionShell id="support" code={t("code")} title={t("title")} subtitle={t("subtitle")} />;
}
