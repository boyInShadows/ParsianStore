import { getTranslations } from "next-intl/server";
import { HeroScrollProvider } from "./HeroScrollProvider";
import { HeroStage } from "./HeroStage";
import { HeadlightBloom, PartCallouts, StageFinale } from "./PartCallout";
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
      <HeroScrollProvider>
        <div className="lg:gap-10 mx-auto flex max-w-container flex-col gap-8 border-x border-graphite-800 px-4 py-12 lg:px-8 lg:py-16">
          {/* The headline reads across the container now rather than down a
              26rem column, so the same copy sets in fewer lines at the same
              token size. `text-balance` is still what removes the orphan. */}
          <header className="flex max-w-4xl flex-col gap-3">
            <div className="flex items-center gap-3">
              <span className="h-px w-12 bg-cta" />
              <p className="font-mono text-data text-graphite-300">{t("code")}</p>
            </div>
            <h1 className="text-balance font-display text-display-1 font-extrabold text-graphite-0">
              {t("headline")}
            </h1>
            <p className="max-w-prose text-body-lg text-graphite-200">{t("subheadline")}</p>
          </header>

          <p className="max-w-prose text-body text-graphite-200">{t("diagramLead")}</p>

          <HeroStage
            label={t("diagramLabel")}
            carAlt={t("staticStateAlt")}
            hint={t("scrollHint")}
            callouts={<PartCallouts />}
            bloom={<HeadlightBloom />}
            finale={<StageFinale />}
            manifest={<PartsManifest />}
            steps={<StageSteps next={tManifest("stepNext")} previous={tManifest("stepPrevious")} />}
          />

          {/* What the animation says, for anyone who cannot watch it (P13.S11).
              Crawlable prose as well as screen-reader content: it is the only
              place the page states the order the parts come off in. */}
          <StationOutline />

          {/* Decides which caption is showing and which sprite is lit. Renders
              no markup of its own, and sits outside the stage so the
              server-rendered plates stay server-rendered: a Client Component
              cannot render an async Server Component, but it can receive one as
              a prop, which is what the slots above are. */}
          <StageNarration />

          <div className="flex items-center gap-3 font-mono text-caption text-graphite-400">
            <span>SAIPA</span>
            <span className="h-px w-6 bg-graphite-700" />
            <span>IRAN KHODRO</span>
          </div>
        </div>
      </HeroScrollProvider>
    </section>
  );
}
