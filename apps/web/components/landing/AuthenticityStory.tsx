import { getTranslations } from "next-intl/server";
import { SectionShell } from "./SectionShell";

// Real worked example against an actual product's Authenticity Record
// (masterPlan.md §3.5, §5 item 06 -- "not a slogan block") is P4.S4
// content work once a real seeded product is picked to illustrate it.
export async function AuthenticityStory() {
  const t = await getTranslations("Landing.sections.authenticityStory");

  return (
    <SectionShell id="authenticity" code={t("code")} title={t("title")} subtitle={t("subtitle")} />
  );
}
