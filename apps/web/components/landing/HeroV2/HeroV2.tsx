import { getTranslations } from "next-intl/server";
import { CATALOG_SYSTEMS, toPersianDigits } from "schemas";
import { VehicleSelectorLazy } from "@/components/garage";
import { getSystemPartCounts } from "@/lib/fetchers/exploded-view";
import { HeroScrollProvider } from "./HeroScrollProvider";
import { HeroStage } from "./HeroStage";
import { PartCodeSearch } from "./PartCodeSearch";
import { PartsManifest } from "./PartsManifest";

/**
 * Every catalog system, as a ruled index beside the diagram.
 *
 * This is where the hero earns the removal of the standalone Shop-by-system
 * grid (P9.S9): the diagram is a car, and a car's panels are body and
 * front-end trim -- none of them honestly stands for "brakes" or "gearbox", so
 * the artwork alone cannot carry ten destinations. The index does, with each
 * system's mono code and its real product count.
 */
async function SystemIndex({ linkAction }: { linkAction: string }) {
  const t = await getTranslations("Landing.beats.hero");
  const counts = await getSystemPartCounts();

  return (
    <>
      {/* The standalone Shop-by-system grid was deleted at P9.S9 because this
          rail already covers its destinations one for one. Its heading survives
          as a landmark so the page does not lose the section's semantics along
          with its markup -- visually redundant next to the diagram's own lead
          line, so it is sr-only rather than repeated on screen. */}
      <h2 id="shop-by-system-heading" className="sr-only">
        {t("systemIndexTitle")}
      </h2>
      <ul
        aria-labelledby="shop-by-system-heading"
        className="grid grid-cols-1 border-t border-graphite-800 sm:grid-cols-2"
      >
        {CATALOG_SYSTEMS.map((system) => {
          const count = counts[system.code];
          return (
            <li key={system.code} className="border-b border-graphite-800">
              <a
                href={`/c/${system.slug}`}
                className="flex min-h-12 items-center justify-between gap-3 py-3 text-graphite-100 transition-colors hover:text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:transition-none"
              >
                <span className="flex items-center gap-3">
                  <span className="font-mono text-data text-graphite-400">{system.code}</span>
                  <span className="text-body-sm">{system.name.fa}</span>
                </span>
                {count !== null ? (
                  <span className="font-mono text-caption text-graphite-400">
                    {/* Persian copy takes Persian digits, and ICU's plain
                        `{count}` is a string substitution -- no locale shaping
                        -- so "۳۲ قطعه" was rendering as "32 قطعه". The repo
                        already owns this: `toPersianDigits` in
                        packages/schemas/src/fa.ts, which the admin tables use
                        for exactly this. */}
                    {t("partsCount", { count: toPersianDigits(count) })}
                  </span>
                ) : null}
                {/* The action, added to the accessible name rather than
                    replacing it. An `aria-label` here used to override the
                    whole name with "سیستم موتور — مشاهده قطعات" while the link
                    reads "SYS-01 موتور ۳۲ قطعه" on screen -- a WCAG 2.5.3
                    (Label in Name, level A) failure, because a voice-control
                    user saying what they can see would not match the name.
                    Playwright's axe run does not catch it: the rule is one of
                    axe's experimental set and off by default. Lighthouse
                    enables it, which is how P9.S17's measurement pass found
                    it. */}
                <span className="sr-only">{linkAction}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </>
  );
}

/**
 * Hero v2 — the Exploded View in a new costume (fableTasks D4).
 *
 * The signature stays the signature: one vehicle, every system reachable from
 * it, the two entry paths inside the composition rather than stacked below it,
 * plus the Mechanic's code field the audit asked for.
 *
 * What the page opens with changed at P9.S5 part 2: the car arrives *whole*,
 * assembled from a stripped body and seven docked sprites, and (part 3) comes
 * apart group by group on scroll rather than starting apart.
 *
 * Server component; the scroll stage and the code field are the two client
 * leaves, and both are leaves.
 */
export async function HeroV2() {
  const t = await getTranslations("Landing.beats.hero");

  return (
    <section id="hero" className="overflow-x-clip bg-graphite-950 text-graphite-50">
      {/* The no-JS half of the pair in globals.css. Without JavaScript the
          undock never runs, so the stage shows the docked car -- correct, and
          exactly what a reduced-motion visitor gets -- but the track's extra
          scroll distance would still be there, a screen and a half of empty
          space in front of a picture that never moves. This collapses it.

          It must NOT clear the layers' transforms. The version of this block
          that shipped with the v1 hero did (`transform:none!important`), which
          against a docked car would undock every sprite. `noscript` takes raw
          HTML rather than children so React cannot escape the CSS. */}
      <noscript
        dangerouslySetInnerHTML={{
          __html:
            "<style>.hero-track{min-height:0!important}" +
            ".hero-pin{position:static!important}</style>",
        }}
      />
      {/* The copy column widens only at xl. At lg it stays 26rem because the
          stage is already at its tightest there -- 32rem would take 19% of the
          diagram's width to buy a line of headline, which is the wrong trade at
          the one breakpoint where the diagram can least afford it. From 1280px up
          the room is free: the stage still gets 654-814px. */}
      {/* The provider wraps both columns because the stage and the parts
          manifest live in different cells and read the same scroll progress
          (P12.S4). It renders no markup of its own -- the track it measures is
          still the one HeroStage draws. */}
      <HeroScrollProvider>
        <div className="mx-auto grid max-w-container gap-8 border-x border-graphite-800 px-4 py-12 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:gap-12 lg:px-8 lg:py-16 xl:grid-cols-[minmax(0,32rem)_minmax(0,1fr)]">
          <div className="flex flex-col gap-8 lg:sticky lg:top-24 lg:self-start">
            {/* The plate number belongs to the headline, so it is inside the
              headline's block at a 12px gap rather than a sibling of it at the
              column's 32px one -- every other section anchors its marker this
              way (SectionShell's code/heading pair). Detached, it read as a
              third floating element between the header and the h1. */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span className="h-px w-12 bg-cta" />
                <p className="font-mono text-data text-graphite-300">{t("code")}</p>
              </div>

              <div>
                {/* `text-balance` is what removes the orphan rather than the size
                  cap alone: at any size this measure allows, the browser's
                  greedy wrap leaves the last line short. Balance is capped at
                  six lines in Chromium and degrades to normal wrapping where it
                  is unsupported -- which is why the token was retuned too, so
                  the fallback is four even lines rather than five ragged. */}
                <h1 className="text-balance font-display text-display-1 font-black text-graphite-0">
                  {t("headline")}
                </h1>
                <p className="mt-4 text-body-lg text-graphite-200">{t("subheadline")}</p>
              </div>
            </div>

            {/* Anchor target for the closing beat's CTA -- «از خودروت شروع کن»
              returns here, because naming a car is where every route into the
              catalogue on this page begins. `scroll-mt` clears the sticky
              header so the heading is not hidden under it on arrival. */}
            <div
              id="driver-path"
              className="flex scroll-mt-24 flex-col gap-3 border-t border-graphite-800 pt-6"
            >
              <h2 className="text-body font-bold text-graphite-0">{t("driverPath.title")}</h2>
              <p className="text-body-sm text-graphite-300">{t("driverPath.hint")}</p>
              <div className="border border-graphite-700 bg-graphite-900 p-4">
                <VehicleSelectorLazy />
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-graphite-800 pt-6">
              <h2 className="text-body font-bold text-graphite-0">{t("mechanicPath.title")}</h2>
              <PartCodeSearch
                label={t("mechanicPath.codeLabel")}
                placeholder={t("mechanicPath.codePlaceholder")}
                hint={t("mechanicPath.codeHint")}
                submit={t("mechanicPath.codeSubmit")}
                emptyError={t("mechanicPath.codeEmptyError")}
              />
            </div>

            {/* After the selector and the code field, so the tab order runs
              driver path -> mechanic path -> the parts themselves (§2.3). */}
            <PartsManifest variant="panel" />

            <div className="flex items-center gap-3 font-mono text-caption text-graphite-400">
              <span>SAIPA</span>
              <span className="h-px w-6 bg-graphite-700" />
              <span>IRAN KHODRO</span>
            </div>
          </div>

          {/* `min-w-0`: a grid item's automatic minimum size is its min-content
            width, and this column now holds a horizontally scrolling rail
            (P12.S5). Without it the item refuses to shrink below the rail's
            unwrapped 1248px, overflows the 390px track, and `overflow-x-clip`
            on the section hides the damage instead of showing it. */}
          <div className="flex min-w-0 flex-col gap-6">
            <p className="max-w-prose text-body text-graphite-200">{t("diagramLead")}</p>
            <HeroStage
              label={t("diagramLabel")}
              carAlt={t("staticStateAlt")}
              hint={t("scrollHint")}
            />
            {/* The mobile half of the manifest, under the stage it indexes
              (§2.2). Above 1024px this is display:none and the side panel in
              the copy column takes over. */}
            <PartsManifest variant="rail" />
            <SystemIndex linkAction={t("systemLinkAction")} />
          </div>
        </div>
      </HeroScrollProvider>
    </section>
  );
}
