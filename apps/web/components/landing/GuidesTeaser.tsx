import { getTranslations } from "next-intl/server";
import { SectionShell } from "./SectionShell";

// Real "3 latest posts" grid needs the blog/guides content system, which
// doesn't exist yet (masterPlan.md §5 item 12 names this the SEO moat --
// Phase 8+ per the roadmap's "Blog + guides" line). P4.S5 revisits this
// section once that's scoped; no fake post titles in the meantime.
export async function GuidesTeaser() {
  const t = await getTranslations("Landing.sections.guidesTeaser");

  return <SectionShell id="guides" code={t("code")} title={t("title")} subtitle={t("subtitle")} />;
}
