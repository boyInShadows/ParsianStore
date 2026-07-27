import { getTranslations } from "next-intl/server";
import { SectionShell } from "./SectionShell";

// Real phone-first single-field signup form (with its own submit action)
// is P4.S5 content work (masterPlan.md §5 item 14).
export async function Newsletter() {
  const t = await getTranslations("Landing.sections.newsletter");

  return (
    <SectionShell id="newsletter" code={t("code")} title={t("title")} subtitle={t("subtitle")} />
  );
}
