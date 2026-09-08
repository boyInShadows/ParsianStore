import { getTranslations } from "next-intl/server";
import { CALLOUT_DOT, HERO_CANVAS } from "./heroLayout";
import { leaderTarget } from "./cameraRig";
import { scenePartById } from "./heroScene";
import type { HeroStation } from "./heroStations";
import { calloutSubjects } from "./manifestData";

/**
 * The narrator the hero did not have (fableTasks v1.1 §1.3, P13.S3/S5).
 *
 * The audit's first finding: "a part slides 40-80px away from the body and
 * slides back. Nothing tells the visitor what just detached, that we sell it,
 * or where to click." This is the answer -- a plate naming the part, its system
 * code, one line of why it matters, and a link into the catalogue.
 *
 * ## A Server Component, and that is the whole design
 *
 * Ten plates of text and links are exactly what should not reach the browser as
 * JavaScript. The route is over both its JS and its TBT budget before this step,
 * and the parts manifest is already a Server Component for the same reason. So
 * the markup renders on the server and the only client code is one small leaf
 * (`StageNarration`) writing a `data-shown` attribute as the scroll passes each
 * beat -- the same shape as `ManifestCheckIn` and the `data-highlight`
 * delegation in `HeroScrollProvider`. Nothing re-renders on scroll.
 *
 * ## Why the plate is a fixed slot and not a floating label
 *
 * The first design put each plate in canvas coordinates beside the part it
 * names, with a leader line joining them. It rendered well in chapters 2 and 3
 * and was wrong in chapter 1, for a reason worth recording because no diff
 * shows it:
 *
 * A plate inside the camera is measured in canvas pixels, so the camera scales
 * it. Chapter 1 pushes in to 1.35 -- which magnifies the plate by 35% *and*
 * shrinks the visible canvas window to about 760x570 at the same time. The
 * plate gets bigger exactly where there is least room for it. At that framing a
 * 360-wide plate cannot clear the bumper on either side, and the headlights'
 * caption rendered cut in half at the top edge of the stage. Making the plate
 * narrower only makes its copy wrap taller, which the 195-row band cannot take
 * either: the geometry has no solution that keeps the why-line.
 *
 * So the caption lives in **stage** space, at one slot, at a constant size. It
 * cannot be clipped by the camera, cannot cover the car, cannot collide with
 * the part, and needs no solver at all. The slot sits on the opposite side from
 * the part -- a part that lifted gets a caption low, a part that dropped gets
 * one high -- so caption and subject are never in the same half of the stage.
 *
 * The cost was the leader line. `PartLeaders` below buys it back without buying
 * the clipping with it (P14.S5): the plate stays exactly here, in stage space,
 * at a constant size, and what goes into canvas space is a dot on the part and
 * a one-pixel line from that dot to the plate. The dot is the end that has to
 * be glued to its subject, so it is the end that belongs inside the camera; the
 * text is the end that gets magnified and cropped, so it stays outside it.
 *
 * ## The one part with no link
 *
 * The windshield undocks and the catalogue has no glass route, so its plate has
 * a name and no destination (`calloutSubjects`). "Every detachment is a sale"
 * holds for everything that is for sale; the exception says so rather than
 * sending anyone to a page that does not exist.
 */
export async function PartCallouts() {
  const t = await getTranslations("Landing.manifest");
  const byLayer = scenePartById();

  return (
    <>
      {calloutSubjects().map((subject) => {
        const part = byLayer.get(subject.layerIds[0]!);
        if (!part) return null;

        const body = (
          <>
            <span className="hero-callout-head flex items-baseline justify-between gap-3">
              <span className="hero-callout-name text-body-sm font-semibold">
                {t(`parts.${subject.nameKey}`)}
              </span>
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
            <span className="hero-callout-why text-caption">{t(`why.${subject.nameKey}`)}</span>
          </>
        );

        return (
          <div
            key={subject.id}
            className="hero-callout"
            data-callout={subject.id}
            data-part={subject.id}
            // The band the part travels into; the caption takes the other one.
            data-band={part.band}
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
    </>
  );
}

/**
 * The narrator's own line, one per station (P14.S5 item 6).
 *
 * The hero could say which part had just come off and could not say *why the
 * scene was worth watching*. The station labels it did have -- «جلوی خودرو»,
 * «موتور و کاپوت», «بدنه» -- are index entries, and they only ever reached a
 * screen reader (`StageNarration`'s live region) and the crawlable outline.
 * These five sentences are the copy the plan wrote, and they are on screen.
 *
 * ## Why all five are rendered and only one is visible
 *
 * The block sits under the stage, in the page's flow, so its height is layout
 * that the pinned stage's siblings -- the hint, the finale CTA, the station
 * buttons -- sit under. Five sentences of different lengths wrap to different
 * numbers of lines at 390px, so swapping one for another would shift everything
 * below it every time the scroll crossed a chapter.
 *
 * A one-cell grid solves that with no measurement: every line is placed in
 * `grid-area: 1/1`, so the container is always as tall as the LONGEST of them
 * and the height never changes. Hidden lines use `visibility` rather than
 * `display`, which is what keeps them contributing that intrinsic height -- and
 * also what keeps them out of the accessibility tree, so a screen reader reads
 * exactly the one line that is showing.
 *
 * Beat 0 ships with `data-shown` already set, which is the no-JS and
 * reduced-motion state as well as the first frame: the same reasoning as the
 * job card's rows (`PartsManifest`), where the server sends the finished thing
 * and the client only ever moves it.
 */
export async function StationLines() {
  const t = await getTranslations("Landing.manifest");

  return (
    <div className="hero-stations">
      {STATION_LINE_IDS.map((id) => (
        <p
          key={id}
          className="hero-station text-body-sm text-text-muted"
          data-station={id}
          data-shown={id === "0" ? "" : undefined}
        >
          {t(`stationCaption.${id}`)}
        </p>
      ))}
    </div>
  );
}

/**
 * Beat 0 plus the four stations, in the order they play.
 *
 * `"0"` is not a station -- `heroStations()` has four entries and none of them
 * is the beat before anything has moved -- so it is a literal here rather than
 * derived. The other four ARE derived, by construction: they are
 * `HeroStation["id"]`, so a fifth chapter would fail to type-check here rather
 * than silently render four lines for five scenes.
 */
const STATION_LINE_IDS = ["0", "1", "2", "3", "finale"] as const satisfies readonly (
  "0" | HeroStation["id"]
)[];

/**
 * The anchor dot and its leader (P14.S5) — the half of "anchor the narrator"
 * that the geometry actually allows.
 *
 * The plan (S5.1) asked for each plate to move next to its part with a leader
 * line joining them. P13.S5 built precisely that and reverted it; the docstring
 * at the top of this file records why, and the reason has not changed. So this
 * draws the *connection* and leaves the text where it is: a dot at the part's
 * detached centroid, and a hairline from that dot to the plate.
 *
 * ## Why it is one SVG per subject, inside the frame
 *
 * The dot has to sit on the part, which means canvas coordinates, which means
 * inside the camera -- when chapter 1 pushes in to 1.35 the part moves and the
 * dot has to move with it. That puts the plate end of the line in a coordinate
 * system the plate is not in, and the honest reading of that is: the line's far
 * end is approximate while the camera is moving and exact when it is parked.
 * Which is the right trade here, because the moment the visitor reads a plate
 * is the moment the beat is *held* -- `BEAT_HOLD` exists for exactly that -- and
 * a camera that has arrived is a camera that has stopped.
 *
 * `viewBox="0 0 1024 1024"` over a square frame means one user unit is one
 * canvas pixel, so the anchor from `heroScene` goes in unconverted.
 * `vector-effect="non-scaling-stroke"` is what keeps "1px" true through the
 * camera's scale -- without it the line would be a third thicker during the
 * push-in, which is the one thing a leader must never look like.
 *
 * Server-rendered and inert, like the plates: ten SVGs of two elements each,
 * shown by the same `data-callout` / `data-shown` write `StageNarration`
 * already makes. `aria-hidden`, because the plate is the accessible content and
 * a screen reader has no use for a line.
 */
export function PartLeaders() {
  const byLayer = scenePartById();

  return (
    <>
      {calloutSubjects().map((subject) => {
        const part = byLayer.get(subject.layerIds[0]!);
        if (!part) return null;
        const target = leaderTarget(part.band, part.chapter);

        return (
          <svg
            key={subject.id}
            className="hero-leader"
            data-callout={subject.id}
            viewBox={`0 0 ${HERO_CANVAS} ${HERO_CANVAS}`}
            aria-hidden="true"
            focusable="false"
          >
            {/* `pathLength="1"` normalises the dash to the line's own length,
                so one keyframe draws every leader at the same rate however far
                its part is from its plate -- the alternative is a dasharray per
                part, computed from a hypotenuse, restated in CSS. */}
            <line
              className="hero-leader-line"
              x1={part.anchor.x.toFixed(2)}
              y1={part.anchor.y.toFixed(2)}
              x2={target.x.toFixed(2)}
              y2={target.y.toFixed(2)}
              pathLength="1"
              vectorEffect="non-scaling-stroke"
            />
            <circle
              className="hero-leader-dot"
              cx={part.anchor.x.toFixed(2)}
              cy={part.anchor.y.toFixed(2)}
              r={CALLOUT_DOT}
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        );
      })}
    </>
  );
}

/**
 * Bloom diameter in canvas pixels.
 *
 * Wider than a lamp (the near lens is 47 canvas pixels): a glow the size of the
 * thing glowing reads as a highlight on the glass, not as light leaving it.
 */
const BLOOM = 190;

const pct = (value: number) => `${((value / HERO_CANVAS) * 100).toFixed(4)}%`;

/**
 * The headlights' glow (P13.S5).
 *
 * Unlike the captions this *does* belong in canvas space: it is light on a
 * lamp, so it has to sit exactly where the lamp is and move with the camera the
 * way the lamp does. Two discs, because the headlights are one part rendered as
 * two clipped instances of a single file a third of the car apart.
 */
export function HeadlightBloom() {
  const byLayer = scenePartById();
  const lamps = ["lamp-far", "lamp-near"]
    .map((id) => byLayer.get(id))
    .filter((part): part is NonNullable<typeof part> => Boolean(part));

  return (
    <>
      {lamps.map((lamp) => (
        <div
          key={lamp.id}
          className="hero-bloom"
          data-callout="headlights"
          aria-hidden="true"
          style={{
            insetInlineStart: pct(lamp.anchor.x - BLOOM / 2),
            top: pct(lamp.anchor.y - BLOOM / 2),
            width: pct(BLOOM),
            height: pct(BLOOM),
            // Behind every sprite but above the base car: a lamp lit from
            // behind, not a disc painted over the lens.
            zIndex: 2,
          }}
        />
      ))}
    </>
  );
}

/**
 * The finale's call to action (P13.S8).
 *
 * Rendered outside the canvas frame, like the captions and for the same reason:
 * a button is not part of the diagram, and inside the frame it would tilt six
 * degrees during chapter 2 and sit at canvas row 635 -- the middle of the car,
 * because the two clear bands are exactly where the ten parked parts are.
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
          /c/[slug] and no category index, so that link 404s, which the landing
          page's own link sweep caught. Rather than invent an index route inside
          a hero step, the button goes to the catalogue that does exist and the
          copy says what the destination actually is. */}
      <a
        className="inline-flex min-h-12 items-center justify-center rounded-md bg-cta px-6 py-3 text-body-sm font-bold text-cta-fg transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:transition-none"
        href="/search"
      >
        {t("finale.cta")}
      </a>
      <a
        className="inline-flex min-h-12 items-center justify-center border border-border px-6 py-3 text-body-sm text-text transition-colors hover:border-brand hover:text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:transition-none"
        href="#driver-path"
      >
        {t("finale.secondary")}
      </a>
    </div>
  );
}
