import { getTranslations } from "next-intl/server";

// The Exploded View (SVG assembly, load choreography) lands in P4.S2; the
// in-composition vehicle selector lands in P4.S3 (masterPlan.md §5 item 01,
// §1.3). The motion budget reserves the page's one orchestrated load
// sequence for this section specifically, so it deliberately does NOT use
// the Reveal scroll-in wrapper every other section uses.
export async function Hero() {
  const t = await getTranslations("Landing.sections.hero");

  return (
    <section id="hero" className="mx-auto max-w-container px-4 py-16">
      <p className="font-mono text-data text-text-muted">{t("code")}</p>
      <h1 className="font-display text-display-1 font-black text-text">{t("headline")}</h1>
      <p className="mt-2 max-w-2xl text-body-lg text-text-muted">{t("subheadline")}</p>
    </section>
  );
}
