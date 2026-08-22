import { getTranslations } from "next-intl/server";
import { fetchBrands } from "@/lib/fetchers/brands";
import { Marquee, Reveal } from "@/components/motion";

// masterPlan.md §5 item 05: real brand names from the seeded catalog
// (BRAND_SEED_DATA, 15 real automotive brands). Text, not logo images --
// no real logo assets exist, and these are trademarked marks that can't
// be fabricated/sourced without rights, unlike every other "missing
// asset" gap on this page (which are just placeholders for content we
// own). Marquee already pauses on hover + prefers-reduced-motion
// (components/motion/Marquee.tsx, built in P1.S7).
export async function BrandWall() {
  const t = await getTranslations("Landing.beats.brandWall");
  const brands = await fetchBrands();

  if (brands.length === 0) return null;

  return (
    <section
      id="brand-wall"
      aria-labelledby="brand-wall-heading"
      className="mx-auto max-w-container px-4 py-12"
    >
      <Reveal className="flex flex-col gap-2">
        <p className="font-mono text-data text-text-muted">{t("code")}</p>
        <h2 id="brand-wall-heading" className="font-display text-h2 font-black text-text">
          {t("title")}
        </h2>
      </Reveal>
      <Marquee className="mt-6" label={t("label")}>
        {brands.map((brand) => (
          <a
            key={brand.id}
            href={`/brand/${brand.slug}`}
            className="font-display text-h3 font-black text-text-muted grayscale transition-all hover:text-text hover:grayscale-0 motion-reduce:transition-none"
          >
            {brand.name.fa}
          </a>
        ))}
      </Marquee>
    </section>
  );
}
