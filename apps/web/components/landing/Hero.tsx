import { getTranslations } from "next-intl/server";
import { getSystemPartCounts } from "@/lib/fetchers/exploded-view";
import { ExplodedView } from "./ExplodedView";

// The in-composition vehicle selector lands in P4.S3 (masterPlan.md §5
// item 01). The Exploded View (P4.S2) is the page's one orchestrated load
// sequence -- it deliberately does NOT use the Reveal scroll-in wrapper
// every other section uses (masterPlan.md §5 motion budget).
export async function Hero() {
  const t = await getTranslations("Landing.sections.hero");
  const counts = await getSystemPartCounts();

  return (
    <section id="hero" className="mx-auto flex max-w-container flex-col gap-8 px-4 py-16">
      <div>
        <p className="font-mono text-data text-text-muted">{t("code")}</p>
        <h1 className="font-display text-display-1 font-black text-text">{t("headline")}</h1>
        <p className="mt-2 max-w-2xl text-body-lg text-text-muted">{t("subheadline")}</p>
      </div>
      <ExplodedView counts={counts} />
    </section>
  );
}
