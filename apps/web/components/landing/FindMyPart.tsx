import { getTranslations } from "next-intl/server";
import { CATALOG_SYSTEMS, toPersianDigits } from "schemas";
import { VehicleSelectorLazy } from "@/components/garage";
import { getSystemPartCounts } from "@/lib/fetchers/exploded-view";
import { Reveal } from "@/components/motion";
import { PartCodeSearch } from "./HeroV2/PartCodeSearch";
import { SavedCarLead } from "./SavedCarLead";
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
  // Two namespaces: this section has its own plate and heading, and it still
  // renders the hero's two entry paths and system index, whose copy stays where
  // it was so nothing had to be duplicated to move a component.
  const t = await getTranslations("Landing.beats.hero");
  const tSection = await getTranslations("Landing.beats.findMyPart");
  const counts = await getSystemPartCounts();

  return (
    <section
      id="find-my-part"
      aria-labelledby="find-my-part-heading"
      className="border-b border-border bg-bg text-text"
    >
      <div className="mx-auto flex max-w-container flex-col gap-8 border-x border-border px-4 py-12 lg:px-8 lg:py-16">
        <Reveal className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <span className="h-px w-12 bg-cta-ink" />
            <p className="font-mono text-data text-text-muted">{tSection("code")}</p>
          </div>
          <h2 id="find-my-part-heading" className="font-display text-h2 font-bold text-text">
            {tSection("title")}
          </h2>
          {/* P14.S6 item 4: every section opens with its H2 and a lead. This
              was the one primary section on the page with no sentence under
              its heading -- the two cards below had to explain themselves.

              P15.S4: the lead names the visitor's car when the garage holds
              one. `subtitle` is what the server renders and what is in the
              HTML; the client leaf swaps its text after hydration and nothing
              else. `raw` because the substitution happens in the browser --
              the label only exists there -- so what crosses the boundary is
              the ICU-free template, not a formatted string. */}
          <SavedCarLead
            generic={tSection("subtitle")}
            personalized={String(tSection.raw("subtitleWithCar"))}
          />
        </Reveal>

        {/* Side by side from `md`, because these are alternatives rather than
            steps: a visitor has either a car or a part number, never both to
            fill in. Stacked they read as a two-step form.

            `grid-cols-1` is load-bearing, not decoration. Without it the
            single mobile column is an *implicit* track, and an implicit track
            is sized `auto` -- its floor is the min-content width of whatever
            sits in it. The widest thing here is the code field's row: an
            `<input>` with no `size` attribute carries a ~194px intrinsic
            width (the browser default `size=20`), and `min-w-0 flex-1` does
            not lower that. `min-w-0` only lets the input shrink once the
            track already has a definite size; it does not reduce the
            min-content the track is measured against. So the track floored at
            ~378px, both cards were stretched to it, and below ~412px they hung
            past the container -- 5px past the viewport at 390px, 35px at
            360px. `grid-cols-1` emits `repeat(1, minmax(0, 1fr))`, whose min
            sizing function is 0 rather than auto, which both lets the track
            shrink and stops the items' own `min-width: auto` from re-applying
            a content floor. `md:grid-cols-2` was already written this way,
            which is why the overflow only ever showed below `md`. */}
        <Reveal stagger className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div
            id="driver-path"
            className="flex scroll-mt-24 flex-col gap-3 border border-border p-6"
          >
            <h3 className="text-body font-bold text-text">{t("driverPath.title")}</h3>
            <p className="text-body-sm text-text-muted">{t("driverPath.hint")}</p>
            <div className="border border-border bg-surface p-4">
              <VehicleSelectorLazy />
            </div>
          </div>

          <div className="flex flex-col gap-3 border border-border p-6">
            <h3 className="text-body font-bold text-text">{t("mechanicPath.title")}</h3>
            <PartCodeSearch
              label={t("mechanicPath.codeLabel")}
              placeholder={t("mechanicPath.codePlaceholder")}
              hint={t("mechanicPath.codeHint")}
              submit={t("mechanicPath.codeSubmit")}
              emptyError={t("mechanicPath.codeEmptyError")}
            />
          </div>
        </Reveal>

        {/* The third path: neither a car nor a code, just a system.
            A 5x2 grid of real cards rather than the two-column text list this
            replaces, where the mono code and the count collided on one line --
            the audit's own «۳۲ قطعهSYS-02». Each card gives the code, the name
            and the count their own line, so nothing shares a baseline with a
            Latin run. */}
        <div className="flex flex-col gap-4">
          <h3 id="shop-by-system-heading" className="text-body font-bold text-text">
            {t("systemIndexTitle")}
          </h3>
          <Reveal
            as="ul"
            stagger
            aria-labelledby="shop-by-system-heading"
            className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
          >
            {CATALOG_SYSTEMS.map((system) => {
              const count = counts[system.code];
              return (
                <li key={system.code}>
                  <a
                    href={`/c/${system.slug}`}
                    className="flex h-full min-h-12 flex-col gap-2 border border-border p-4 text-text transition-colors hover:border-brand hover:text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:transition-none"
                  >
                    {hasSystemGlyph(system.code) ? (
                      <SystemGlyph code={system.code} className="h-6 w-6 text-text-muted" />
                    ) : null}
                    {/* Its own line, isolated: a Latin code sharing a baseline
                        with Persian is what produced «۳۲ قطعهSYS-02». */}
                    <span className="evidence-code font-mono text-data text-text-muted" dir="ltr">
                      {system.code}
                    </span>
                    <span className="text-body-sm">{system.name.fa}</span>
                    {count !== null ? (
                      <span className="font-mono text-caption text-text-muted">
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
          </Reveal>
        </div>
      </div>
    </section>
  );
}
