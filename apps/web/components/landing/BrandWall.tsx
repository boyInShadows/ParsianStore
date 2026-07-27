import { getTranslations } from "next-intl/server";
import { SectionShell } from "./SectionShell";

// The grayscale-to-color Marquee (components/motion/Marquee.tsx already
// exists, pauses on hover + prefers-reduced-motion) plus real brand-logo
// assets land in P4.S4 (masterPlan.md §5 item 05). No logo files exist yet,
// so this stays heading-only rather than shipping broken <img> sources.
export async function BrandWall() {
  const t = await getTranslations("Landing.sections.brandWall");

  return (
    <SectionShell id="brand-wall" code={t("code")} title={t("title")} subtitle={t("subtitle")} />
  );
}
