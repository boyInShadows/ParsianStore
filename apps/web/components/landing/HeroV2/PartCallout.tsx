import { getTranslations } from "next-intl/server";
import { HERO_CANVAS } from "./heroLayout";
import { calloutPlacements } from "./heroScene";
import { calloutSubjects } from "./manifestData";

/**
 * The narrator the hero did not have (fableTasks v1.1 §1.3, P13.S3).
 *
 * The audit's first finding: "a part slides 40-80px away from the body and
 * slides back. Nothing tells the visitor what just detached, that we sell it,
 * or where to click." This is the answer -- a plate naming the part, its system
 * code, one line of why it matters, and a link into the catalogue, joined to
 * the part by a leader line.
 *
 * ## A Server Component, and that is the whole design
 *
 * Eleven plates of text and links are exactly what should not reach the browser
 * as JavaScript. The route is 13 KB over its budget and 61ms over its TBT
 * budget before this step, and the parts manifest is already a Server Component
 * for the same reason. So the markup is rendered on the server, positioned
 * entirely by CSS custom properties computed at build time, and the only client
 * code is one small leaf (`StageNarration`) that writes a `data-shown`
 * attribute as the scroll passes each beat -- the same shape as
 * `ManifestCheckIn` and the `data-highlight` delegation in `HeroScrollProvider`.
 *
 * Nothing here re-renders on scroll. Nothing here is a component per part.
 *
 * ## Why the plates live inside the camera
 *
 * They are positioned in canvas coordinates, in the same frame as the sprites,
 * so they scale and tilt with the camera. That is deliberate: a plate anchored
 * in stage space would need its anchor re-projected through the camera every
 * frame to keep the leader line touching the part, which is per-frame client
 * work for a line. Inside the frame the geometry is static and the browser does
 * the transform once, on the compositor. The cost is that the type scales with
 * the camera -- about 35% larger in chapter 1 than in chapter 3 -- which is
 * what a camera does to everything else in shot.
 *
 * ## The one part with no link
 *
 * The windshield undocks and the catalogue has no glass route, so its plate is
 * a `<span>` with a name and no destination (`calloutSubjects`). "Every
 * detachment is a sale" holds for everything that is for sale; the exception
 * says so rather than sending anyone to a page that does not exist.
 */

const pct = (value: number) => `${((value / HERO_CANVAS) * 100).toFixed(4)}%`;

export async function PartCallouts() {
  const t = await getTranslations("Landing.manifest");
  const subjects = new Map(calloutSubjects().map((subject) => [subject.id, subject]));
  const placements = calloutPlacements();

  return (
    <div className="hero-callouts pointer-events-none absolute inset-0">
      {/* One SVG for every leader line, sized to the canvas so the lines scale
          with the frame exactly as the sprites do. `vector-effect` keeps the
          stroke a hairline at any camera scale -- without it chapter 1's
          push-in would draw a 1.35px line and chapter 3 a 1.1px one, and the
          hero would look like it had two different line weights. */}
      <svg
        className="absolute inset-0 h-full w-full overflow-visible"
        viewBox={`0 0 ${HERO_CANVAS} ${HERO_CANVAS}`}
        preserveAspectRatio="none"
        aria-hidden="true"
        focusable="false"
      >
        {placements.map((placement) =>
          placement.anchors.map((anchor, index) => {
            // The line ends at the plate's near edge, not its centre, so it
            // touches the caption instead of disappearing under it.
            const plateY =
              placement.band === "above"
                ? placement.label.top + placement.label.height
                : placement.label.top;
            const plateX = placement.label.left + placement.label.width / 2;
            return (
              <line
                key={`${placement.id}-${index}`}
                data-callout={placement.id}
                className="hero-leader"
                x1={anchor.x}
                y1={anchor.y}
                x2={plateX}
                y2={plateY}
                vectorEffect="non-scaling-stroke"
              />
            );
          }),
        )}
      </svg>

      {placements.map((placement) => {
        const subject = subjects.get(placement.id);
        if (!subject) return null;
        const name = t(`parts.${subject.nameKey}`);
        const why = t(`why.${subject.nameKey}`);

        const body = (
          <>
            {/* The name and the invitation share a row. As its own line the
                arrow cost 25 canvas pixels of plate height, and the plate has
                to fit inside a band 195 pixels tall beside the part it names --
                so the line that carried the least information lost. */}
            <span className="hero-callout-head flex items-baseline justify-between gap-3">
              <span className="hero-callout-name text-body-sm font-semibold">{name}</span>
              {subject.href ? (
                <span className="hero-callout-go text-caption" aria-hidden="true">
                  {t("calloutGo")}
                </span>
              ) : null}
            </span>
            {subject.system ? (
              // The repo's own bidi isolation (P12.S10). A Latin code inside
              // Persian copy needs `dir` for the direction *within* the run and
              // `unicode-bidi: isolate` for where the run sits relative to the
              // text around it; Tailwind has a utility for the first and none
              // for the second.
              <span className="evidence-code hero-callout-code font-mono text-caption" dir="ltr">
                {subject.system}
              </span>
            ) : null}
            <span className="hero-callout-why text-caption">{why}</span>
          </>
        );

        return (
          <div
            key={placement.id}
            className="hero-callout"
            data-callout={placement.id}
            data-part={placement.id}
            style={{
              insetInlineStart: pct(placement.label.left),
              top: pct(placement.label.top),
              width: pct(placement.label.width),
              // Height as well as width: the plate fills the box the scene
              // solver reserved, so what is on screen is exactly what the
              // collision checks were run against.
              height: pct(placement.label.height),
            }}
          >
            {subject.href ? (
              <a className="hero-callout-plate" href={subject.href}>
                {body}
              </a>
            ) : (
              <span className="hero-callout-plate">{body}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * The finale's call to action (P13.S8).
 *
 * Rendered **outside** the canvas frame, unlike the plates, and the difference
 * is what each thing is. A plate is part of the diagram: it points at a panel,
 * it belongs in the panel's coordinate space, and it is right for it to scale
 * and tilt with the camera. A button is not part of the diagram. Inside the
 * frame it would tilt six degrees during chapter 2, grow 35% during chapter 1,
 * and -- the reason it moved -- sit at canvas row 635, which is the middle of
 * the car, because the two clear bands are exactly where the ten parked parts
 * are.
 *
 * So it pins with the stage instead, under the diagram, where a call to action
 * on a landing page belongs.
 */
export async function StageFinale() {
  const t = await getTranslations("Landing.manifest");

  return (
    <div className="hero-finale flex items-center justify-center gap-4" data-callout="__finale">
      {/* The one marigold on the stage. tokens.css §6.3 reserves it for where
          money changes hands, and the whole hero has been steel blue up to this
          point precisely so this button is the first thing that is not.

          It goes to /search, not /c. The plan asked for «مشاهده همه
          دسته‌بندی‌ها» pointing at /c -- and there is no /c: the app has
          /c/[slug] and no category index, so that link 404s. The landing page's
          own link sweep caught it. Rather than invent an index route inside a
          hero step, the button goes to the catalogue that does exist and the
          copy says what the destination actually is. A /c index is worth
          having; it is a catalogue decision, recorded for the phase close. */}
      <a
        className="inline-flex min-h-12 items-center justify-center rounded-md bg-cta px-6 py-3 text-body-sm font-bold text-cta-fg transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:transition-none"
        href="/search"
      >
        {t("finale.cta")}
      </a>
      <a
        className="inline-flex min-h-12 items-center justify-center border border-graphite-700 px-6 py-3 text-body-sm text-graphite-100 transition-colors hover:border-brand hover:text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:transition-none"
        href="#driver-path"
      >
        {t("finale.secondary")}
      </a>
    </div>
  );
}
