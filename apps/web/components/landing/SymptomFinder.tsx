import { getTranslations } from "next-intl/server";
import { SectionShell } from "./SectionShell";

// Real 8-12 symptom -> filtered-results mapping is P4.S5 content work
// (masterPlan.md §5 item 09) -- needs a real symptom-to-category mapping
// decision, not fabricated example symptoms beyond the one already named
// in the master plan's own worked example ("صدای جیرجیر هنگام ترمز").
export async function SymptomFinder() {
  const t = await getTranslations("Landing.sections.symptomFinder");

  return (
    <SectionShell
      id="symptom-finder"
      code={t("code")}
      title={t("title")}
      subtitle={t("subtitle")}
    />
  );
}
