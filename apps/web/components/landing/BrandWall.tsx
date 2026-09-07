import { getTranslations } from "next-intl/server";
import { fetchBrands } from "@/lib/fetchers/brands";
import { Marquee, Reveal } from "@/components/motion";

// masterPlan.md §5 item 05: real brand names from the seeded catalog
// (BRAND_SEED_DATA, 15 real automotive brands). Text, not logo images --
// no real logo assets exist, and these are trademarked marks that can't
// be fabricated/sourced without rights, unlike every other "missing
// asset" gap on this page (which are just placeholders for content we
// own). Marquee pauses on hover, on focus-within, while off screen and
// under prefers-reduced-motion (components/motion/Marquee.tsx; P14.S7 added
// the off-screen and focus-within halves and rebuilt the seam).
//
// P12.S12 gives the text treatment the weight the missing logos were
// carrying: a ruled band, names at h1 rather than h3, a separator between
// entries. `grayscale` stays on the link although it does nothing to text --
// it is the hook the swap needs on the day real SVG marks arrive
// (fableTasks2 §5.6), so that day is a change of children, not of styling.
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
        <h2 id="brand-wall-heading" className="font-display text-h2 font-bold text-text">
          {t("title")}
        </h2>
      </Reveal>
      {/* A ruled band, not a line of small text (P12.S12, recording defect 6).
          The rules are what make it read as a *wall*: the names sit inside
          something, with air above and below, instead of drifting through the
          page at caption size. */}
      <Reveal className="mt-6 border-y border-border py-8">
        <Marquee
          label={t("label")}
          // A separator, not a gap alone. Two Persian words with only space
          // between them read as a phrase; a mark between them says they are
          // separate entries. It is Marquee's job to place it -- including
          // after the last name, which is the separator the old shape was
          // missing and the reason the loop restarted visibly.
          separator={<span className="text-caption text-border">◆</span>}
          items={brands.map((brand) => (
            <a
              key={brand.id}
              href={`/brand/${brand.slug}`}
              // `whitespace-nowrap`: a brand name broken across two lines
              // inside a horizontally scrolling track is the orphan the plan
              // rules out, and these are proper nouns -- «سایپا یدک» is one
              // name, not two words that may be split.
              // NO `tracking-*`: Persian is a cursive script and letter
              // spacing pulls joined letters apart, so the "deliberate
              // letter-spacing" this step called for would render «بوش» as
              // three disconnected shapes. The spacing that reads as
              // deliberate here is between the names, which is what the
              // separator and its margins do.
              className="whitespace-nowrap font-display text-h1 font-bold text-text-muted grayscale transition-colors duration-base hover:text-text hover:grayscale-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus motion-reduce:transition-none"
            >
              {brand.name.fa}
            </a>
          ))}
        />
      </Reveal>
    </section>
  );
}
