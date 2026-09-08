import { getTranslations } from "next-intl/server";
import { toPersianDigits } from "schemas";
import { HeroScrollProvider } from "./HeroScrollProvider";
import { HeroStage } from "./HeroStage";
import {
  HeadlightBloom,
  PartCallouts,
  PartLeaders,
  StageFinale,
  StationLines,
} from "./PartCallout";
import { PartsManifest } from "./PartsManifest";
import { StageNarration } from "./StageNarration";
import { StageSteps } from "./StageSteps";
import { StationOutline } from "./StationOutline";

/**
 * Hero v2 — the Exploded View, restructured (fableTasks v1.1 P13.S7).
 *
 * The car arrives whole, comes apart part by part on scroll, names each piece
 * as it leaves, and ends as a full catalogue before docking again.
 *
 * ## The shape changed, and the audit's second finding is why
 *
 * It used to be two columns: a sticky copy column holding the headline, the
 * vehicle selector, the code field and the job card, beside the diagram. On a
 * 900px-tall laptop the first three pushed the job card off the bottom of the
 * screen -- so the one element that turns the animation into commerce was
 * invisible for the whole animation, which is exactly what the audit reported.
 *
 * Now the headline sits above, full width, and the **pinned block holds the
 * stage and the job card side by side**. The two conversion tools move to
 * `#find-my-part`, immediately after the hero un-pins. Nothing is lost by that:
 * a visitor who knows their car or has a part number wants a form, not a
 * diagram, and reaches one the moment the hero lets go.
 *
 * Two things fall out of the change that the old layout could not have:
 *
 * - **The diagram is wider.** It no longer shares a row with a 26rem copy
 *   column, so the stage gets most of the container rather than 60% of it.
 * - **The manifest renders once.** The panel had to be sticky beside the
 *   drawing and the rail had to sit under the stage; one element cannot be in
 *   two grid cells, so it was duplicated instead. Both are inside the pinned
 *   block now, so a single instance serves both -- and
 *   `docs/performance-landing.md` measured that duplication as the entire
 *   Phase 12 TBT regression.
 *
 * Server component; the stage, the code field and two attribute-writing leaves
 * are the only client code.
 */
export async function HeroV2() {
  const t = await getTranslations("Landing.beats.hero");
  const tManifest = await getTranslations("Landing.manifest");

  /**
   * What the live region says at each station (P14.S4).
   *
   * Composed here rather than in the client leaf that speaks it: the numbers go
   * through `toPersianDigits` (a station number is read as a number, so the
   * digit policy puts it in Persian), and the names are the same
   * `chapters.*` strings the sr-only outline already prints, so the outline and
   * the announcement can never name the scene differently.
   */
  const stations = {
    "1": tManifest("stationLive", { n: toPersianDigits(1), name: tManifest("chapters.1") }),
    "2": tManifest("stationLive", { n: toPersianDigits(2), name: tManifest("chapters.2") }),
    "3": tManifest("stationLive", { n: toPersianDigits(3), name: tManifest("chapters.3") }),
    finale: tManifest("stationLive", {
      n: toPersianDigits(4),
      name: tManifest("finale.station"),
    }),
  } as const;

  return (
    <section id="hero" className="overflow-x-clip bg-bg text-text">
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
            ".hero-pin{position:static!important}" +
            // The beat-0 narration is a caption the scroll turns off, so it is
            // hidden until `StageNarration` shows it (P14.S3). Without
            // JavaScript nothing ever shows it and the sentence would simply be
            // gone -- and unlike the scroll hint beside it, this one is the
            // hero's actual value proposition. Reduced motion gets the same
            // treatment from globals.css.
            ".hero-lead{display:block!important}</style>",
        }}
      />
      <HeroScrollProvider>
        {/* DOM order is the DESKTOP order, and the reading order: headline,
            subline, stage, outline, brands. Below `lg` the `order-*` utilities
            lift the stage above the subline -- see the header below for why.
            `lg:order-none` on every child hands the column back to source
            order at the breakpoint, so the desktop layout needs no ordering at
            all. Only the subline actually moves; the other four carry an order
            because a flex column with *some* ordered items puts every
            unordered one first, which would have shuffled the outline and the
            brand rule above the stage.

            `gap-6`, down from `gap-8`, and the `lg:gap-10` that used to sit
            beside it is gone entirely: the spacing scale is replaced (10 is not
            a step) so that class had emitted no CSS since the day it was
            written. The step down to 6 buys the fold its margin -- at gap-8 the
            stage started at 34.7% of a 900px viewport against a 35% target,
            which is three pixels of headroom and less than the variance in
            font rasterisation between machines. At gap-6 it is 32.9%.

            `py-12` at every width, where desktop used to take `lg:py-16`: 16px
            of the same budget, spent above a section that opens directly under
            the header. */}
        <div className="mx-auto flex max-w-container flex-col gap-6 border-x border-border px-4 py-12 lg:px-8">
          {/* The headline strip (P14.S3): one line of H1 and one subline.
              `max-w-6xl`, not `max-w-4xl` -- the 50-character headline sets
              1055px wide at the desktop `display-1`, so a 896px column forced
              it onto two lines and spent 63px of the first screen on a wrap.
              At 1152px it sets on one line from 1024px up, which is the whole
              of the "kill the gap" measurement: it is the single biggest item
              above the stage. */}
          <header className="order-1 flex max-w-6xl flex-col gap-3 lg:order-none">
            <div className="flex items-center gap-3">
              {/* `cta-ink` on a theme-following ground: --cta is 1.87:1 on --bg, so
                  the rule beside the plate number simply vanished in light mode.
                  The dark plates (interstitial, closing) keep --cta. */}
              <span className="h-px w-12 bg-cta-ink" />
              <p className="font-mono text-data text-text-muted">{t("code")}</p>
            </div>
            <h1 className="text-balance font-display text-display-1 font-extrabold text-text">
              {t("headline")}
            </h1>
          </header>

          {/* The subline. Out of `<header>` and into its own cell so it can be
              ordered independently, and DELIBERATELY still above the stage in
              source: this is the desktop order, where it belongs to the
              headline strip. Only the mobile `order-3` moves it, and it must
              move rather than the stage: the track is `100vh + 96rem` tall, so
              anything ordered after it lands a whole screen and a half further
              down the page.

              Measured at 390x844, leaving it above the stage put the job card
              -- the one element on this screen that turns the animation into
              commerce -- at y742..912, 68px past the fold. Below it, the card
              lands at y628..798 and the whole hero fits the first screen. It
              carries nothing focusable, so moving it visually cannot disagree
              with the tab order. */}
          <p className="order-3 max-w-prose text-body-lg text-text-muted lg:order-none">
            {t("subheadline")}
          </p>

          <HeroStage
            label={t("diagramLabel")}
            carAlt={t("staticStateAlt")}
            hint={t("scrollHint")}
            lead={t("diagramLead")}
            callouts={<PartCallouts />}
            bloom={<HeadlightBloom />}
            leaders={<PartLeaders />}
            finale={<StageFinale />}
            manifest={<PartsManifest />}
            stationLines={<StationLines />}
            steps={
              <StageSteps
                next={tManifest("stepNext")}
                previous={tManifest("stepPrevious")}
                tour={tManifest("tour")}
                tourStop={tManifest("tourStop")}
              />
            }
          />

          {/* What the animation says, for anyone who cannot watch it (P13.S11).
              Crawlable prose as well as screen-reader content: it is the only
              place the page states the order the parts come off in. */}
          <StationOutline />

          {/* Decides which caption is showing and which sprite is lit, and
              (P14.S4) speaks the station into an `aria-live` region as the
              scene reaches it. Its only markup is that region, which is
              `sr-only` and therefore out of flow, so it still needs no `order`.
              It sits outside the stage so the server-rendered plates stay
              server-rendered: a Client Component cannot render an async Server
              Component, but it can receive one as a prop, which is what the
              slots above are. */}
          <StageNarration stations={stations} />

          {/* `order-4` for the same reason the subline carries one: an
              unordered flex item sorts ahead of every ordered one, which would
              have floated the brand rule to the top of the mobile column.
              (`StationOutline` needs none -- `sr-only` is out of flow -- and
              `StageNarration` renders no element at all.) */}
          <div className="order-4 flex items-center gap-3 font-mono text-caption text-text-muted lg:order-none">
            <span>SAIPA</span>
            <span className="h-px w-6 bg-border" />
            <span>IRAN KHODRO</span>
          </div>
        </div>
      </HeroScrollProvider>
    </section>
  );
}
