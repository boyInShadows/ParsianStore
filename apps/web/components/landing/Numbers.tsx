import { getTranslations } from "next-intl/server";
import { SectionShell } from "./SectionShell";

// Real counts (parts in stock, vehicles covered, orders shipped, years in
// business) must come from real data once decided -- masterPlan.md §5 item
// 10's count-up-on-scroll treatment (components/motion/CountUp.tsx already
// exists) is P4.S5 content work. No numbers are fabricated here.
export async function Numbers() {
  const t = await getTranslations("Landing.sections.numbers");

  return <SectionShell id="numbers" code={t("code")} title={t("title")} subtitle={t("subtitle")} />;
}
