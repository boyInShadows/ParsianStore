import { getTranslations } from "next-intl/server";
import { SectionShell } from "./SectionShell";

// Real "3 latest posts" grid needs the blog/guides content system, which
// doesn't exist yet (masterPlan.md §5 item 12 names this the SEO moat --
// Phase 8+ per the roadmap's "Blog + guides" line). P4.S5 revisits this
// section once that's scoped; no fake post titles in the meantime.
/**
 * Hidden on purpose, not broken. fableTasks §7 item 6 carries the return
 * condition: Phase 9 has no guides content yet, and a teaser with nothing
 * to tease is a heading pointing at an empty room.
 *
 * An explicit named flag rather than deleting the component or commenting out
 * the call site: the section is finished work waiting on something outside the
 * code, and a flag says that where a missing file would just look like an
 * oversight. Flip this to `false` when the condition is met -- nothing else
 * about the section needs to change.
 */
const SECTION_HIDDEN = true;

export async function GuidesTeaser() {
  if (SECTION_HIDDEN) return null;

  const t = await getTranslations("Landing.sections.guidesTeaser");

  return <SectionShell id="guides" code={t("code")} title={t("title")} subtitle={t("subtitle")} />;
}
