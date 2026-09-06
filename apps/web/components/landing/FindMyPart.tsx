import { getTranslations } from "next-intl/server";
import { CATALOG_SYSTEMS, toPersianDigits } from "schemas";
import { VehicleSelectorLazy } from "@/components/garage";
import { getSystemPartCounts } from "@/lib/fetchers/exploded-view";
import { PartCodeSearch } from "./HeroV2/PartCodeSearch";
import { SystemGlyph, hasSystemGlyph } from "./SystemGlyph";

/**
 * The two entry paths and the system index, after the hero un-pins (P13.S7).
 *
 * ## Why they left the hero
 *
 * The audit's second finding was that the job card -- the one element that
 * turns the animation into commerce -- sat below the fold for the whole
 * animation. It was in the hero's sticky column, but *underneath* the vehicle
 * selector and the code field, and on a 900px-tall laptop those two pushed it
 * off screen.
 *
 * The fix is an order, not a relocation: the job card takes the pinned space
 * beside the drawing, and the conversion tools get their own section
 * immediately after it. They lose nothing by being here -- a visitor who knows
 * their car or has a part number is looking for a form, not for a diagram, and
 * arrives at one the moment the hero lets go. The diagram gets the room it was
 * competing for.
 *
 * `#driver-path` moves with the selector: the closing beat's CTA and the hero's
 * own finale button both target it, and both should land on the selector rather
 * than on where it used to be.
 */
export async function FindMyPart() {
  const t = await getTranslations("Landing.beats.hero");
  const counts = await getSystemPartCounts();

  return (
    <section
      id="find-my-part"
      aria-labelledby="find-my-part-heading"
      className="border-b border-graphite-800 bg-graphite-950 text-graphite-50"
    >
      <div className="mx-auto flex max-w-container flex-col gap-8 border-x border-graphite-800 px-4 py-12 lg:px-8 lg:py-16">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <span className="h-px w-12 bg-cta" />
            <p className="font-mono text-data text-graphite-300">{t("findCode")}</p>
          </div>
          <h2 id="find-my-part-heading" className="font-display text-h2 font-black text-graphite-0">
            {t("findTitle")}
          </h2>
        </div>

        {/* Side by side from `md`, because these are alternatives rather than
            steps: a visitor has either a car or a part number, never both to
            fill in. Stacked they read as a two-step form. */}
        <div className="grid gap-6 md:grid-cols-2">
          <div
            id="driver-path"
            className="flex scroll-mt-24 flex-col gap-3 border border-graphite-800 p-6"
          >
            <h3 className="text-body font-bold text-graphite-0">{t("driverPath.title")}</h3>
            <p className="text-body-sm text-graphite-300">{t("driverPath.hint")}</p>
            <div className="border border-graphite-700 bg-graphite-900 p-4">
              <VehicleSelectorLazy />
            </div>
          </div>

          <div className="flex flex-col gap-3 border border-graphite-800 p-6">
            <h3 className="text-body font-bold text-graphite-0">{t("mechanicPath.title")}</h3>
            <PartCodeSearch
              label={t("mechanicPath.codeLabel")}
              placeholder={t("mechanicPath.codePlaceholder")}
              hint={t("mechanicPath.codeHint")}
              submit={t("mechanicPath.codeSubmit")}
              emptyError={t("mechanicPath.codeEmptyError")}
            />
          </div>
        </div>

        {/* The third path: neither a car nor a code, just a system.
            A 5x2 grid of real cards rather than the two-column text list this
            replaces, where the mono code and the count collided on one line --
            the audit's own «۳۲ قطعهSYS-02». Each card gives the code, the name
            and the count their own line, so nothing shares a baseline with a
            Latin run. */}
        <div className="flex flex-col gap-4">
          <h3 id="shop-by-system-heading" className="text-body font-bold text-graphite-0">
            {t("systemIndexTitle")}
          </h3>
          <ul
            aria-labelledby="shop-by-system-heading"
            className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
          >
            {CATALOG_SYSTEMS.map((system) => {
              const count = counts[system.code];
              return (
                <li key={system.code}>
                  <a
                    href={`/c/${system.slug}`}
                    className="flex h-full min-h-12 flex-col gap-2 border border-graphite-800 p-4 text-graphite-100 transition-colors hover:border-brand hover:text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:transition-none"
                  >
                    {hasSystemGlyph(system.code) ? (
                      <SystemGlyph code={system.code} className="h-6 w-6 text-graphite-400" />
                    ) : null}
                    {/* Its own line, isolated: a Latin code sharing a baseline
                        with Persian is what produced «۳۲ قطعهSYS-02». */}
                    <span className="evidence-code font-mono text-data text-graphite-400" dir="ltr">
                      {system.code}
                    </span>
                    <span className="text-body-sm">{system.name.fa}</span>
                    {count !== null ? (
                      <span className="font-mono text-caption text-graphite-400">
                        {/* Persian copy takes Persian digits, and ICU's plain
                            `{count}` is a string substitution with no locale
                            shaping -- so "۳۲ قطعه" rendered as "32 قطعه" until
                            `toPersianDigits` was applied here. */}
                        {t("partsCount", { count: toPersianDigits(count) })}
                      </span>
                    ) : null}
                    {/* The action, appended to the accessible name rather than
                        replacing it. An `aria-label` here used to override the
                        whole name while the link read "SYS-01 موتور ۳۲ قطعه" on
                        screen -- a WCAG 2.5.3 (Label in Name) failure, because a
                        voice-control user saying what they can see would not
                        match. */}
                    <span className="sr-only">{t("systemLinkAction")}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
