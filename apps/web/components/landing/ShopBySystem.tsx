import { getTranslations } from "next-intl/server";
import { SectionShell } from "./SectionShell";

// Real Exploded View components + real SYS-xx codes from
// packages/schemas/src/catalogSystems.ts land here in P4.S4 (masterPlan.md
// §5 item 03) -- this section's own numbering (`code` below) is the landing
// page's # column, not a catalog system code, so the two never collide.
export async function ShopBySystem() {
  const t = await getTranslations("Landing.sections.shopBySystem");

  return (
    <SectionShell
      id="shop-by-system"
      code={t("code")}
      title={t("title")}
      subtitle={t("subtitle")}
    />
  );
}
