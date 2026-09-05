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
        <h2 id="brand-wall-heading" className="font-display text-h2 font-black text-text">
          {t("title")}
        </h2>
      </Reveal>
      {/* A ruled band, not a line of small text (P12.S12, recording defect 6).
          The rules are what make it read as a *wall*: the names sit inside
          something, with air above and below, instead of drifting through the
          page at caption size. */}
      <div className="mt-6 border-y border-border py-8">
        <Marquee className="" label={t("label")}>
          {brands.map((brand, index) => (
            <span key={brand.id} className="flex items-center gap-8">
              {/* A separator, not a gap alone. Two Persian words with only
                  space between them read as a phrase; a mark between them says
                  they are separate entries. `aria-hidden` -- it is punctuation
                  for the eye, and a screen reader walking the links does not
                  need a diamond announced fifteen times. */}
              {index > 0 ? (
                <span aria-hidden="true" className="text-caption text-border">
                  ◆
                </span>
              ) : null}
              <a
                href={`/brand/${brand.slug}`}
                // `whitespace-nowrap`: a brand name broken across two lines
                // inside a horizontally scrolling track is the orphan the plan
                // rules out, and these are proper nouns -- «ساپیا یدک» is one
                // name, not two words that may be split.
                // NO `tracking-*`: Persian is a cursive script and letter
                // spacing pulls joined letters apart, so the "deliberate
                // letter-spacing" this step called for would render «بوش» as
                // three disconnected shapes. The spacing that reads as
                // deliberate here is between the names, which is what the gap
                // and the separator above do.
                className="whitespace-nowrap font-display text-h1 font-black text-text-muted grayscale transition-colors duration-base hover:text-text hover:grayscale-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus motion-reduce:transition-none"
              >
                {brand.name.fa}
              </a>
            </span>
          ))}
        </Marquee>
      </div>
    </section>
  );
}
