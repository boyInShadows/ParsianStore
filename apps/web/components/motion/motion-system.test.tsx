import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Marquee } from "./Marquee.js";
import { Reveal } from "./Reveal.js";
import { REVEAL_WATCHDOG_MS, RevealBoot } from "./RevealBoot.js";

const WEB_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = (...segments: string[]) => readFileSync(path.join(WEB_ROOT, ...segments), "utf8");

const globalsCss = read("styles", "globals.css");
const tokensCss = read("styles", "tokens.css");

const BRANDS = ["بوش", "والئو", "NGK", "دنسو", "ساچمی"];
const RUN_OPEN = '<div class="motion-marquee-run flex w-max shrink-0 items-center"';

const marqueeMarkup = () =>
  renderToStaticMarkup(
    <Marquee
      label="برندها"
      separator="◆"
      items={BRANDS.map((brand) => (
        <a key={brand} href={`/brand/${brand}`}>
          {brand}
        </a>
      ))}
    />,
  );

/**
 * ## The failure class this guards
 *
 * The marquee's seam was not a styling slip -- it was a *structural* asymmetry
 * that no screenshot of a stationary track can show. Fifteen item nodes sat
 * directly in the flex track beside one wrapper `<div>` holding the duplicate,
 * so the two halves of the loop had different child shapes and the separator
 * rhythm broke once per lap, at the one frame that is supposed to be invisible.
 *
 * Every assertion here is about that: the two runs must be the same markup, the
 * separator count must be a multiple of the item count (i.e. the trailing one
 * exists), and the spacing must live somewhere that does not also apply between
 * the runs.
 */
describe("Marquee — the seam", () => {
  it("renders exactly two runs, and they are byte-identical apart from the clone flags", () => {
    const html = marqueeMarkup();

    // The clone differs by exactly three attributes and nothing else. `inert`
    // and not merely `aria-hidden`: these items are links, and aria-hidden
    // alone still lets Tab reach them (axe's aria-hidden-focus rule).
    const cloneFlags = ' data-clone="" aria-hidden="true" inert=""';
    expect(html).toContain(RUN_OPEN + cloneFlags);

    const parts = html.replace(cloneFlags, "").split(RUN_OPEN);
    expect(parts).toHaveLength(3);

    // The tail carries the track's and the wrapper's closing tags on top of
    // the run's own; strip those and the two runs must be the same string.
    const [, firstRun, secondRun] = parts as [string, string, string];
    expect(secondRun).toBe(`${firstRun}</div></div>`);
  });

  it("puts a separator after every item, including the last one in each run", () => {
    const html = marqueeMarkup();

    const separators = html.match(/motion-marquee-sep/g) ?? [];
    // Two runs x one separator per item. The trailing separator is the whole
    // point: without it the last name of a run butts straight against the
    // first name of the next, which is what «◆والئو» looked like.
    expect(separators).toHaveLength(BRANDS.length * 2);
    expect(html.match(/◆/g) ?? []).toHaveLength(BRANDS.length * 2);
  });

  it("spaces items with logical margins on the separator, never with a track gap", () => {
    const html = marqueeMarkup();

    expect(html).toContain("motion-marquee-sep me-8 ms-8");
    // A `gap` on the track would also sit between the two runs, making the
    // track 2 x run + gap wide while the animation translates by exactly half
    // of it -- half a gap of drift per lap.
    expect(html).toContain('class="motion-marquee-track flex w-max"');
  });

  it("hands CSS an item count, not a duration, so the loop scales with the list", () => {
    expect(marqueeMarkup()).toContain(`--marquee-items:${BRANDS.length}`);
    expect(tokensCss).toMatch(/--marquee-item-duration:\s*3\.5s;/);
    expect(globalsCss).toContain(
      "animation: marquee calc(var(--marquee-items) * var(--marquee-item-duration)) linear infinite;",
    );
  });

  it("starts paused and is only started by the in-view attribute", () => {
    // `document.getAnimations()` at scrollY=0 must report the marquee paused.
    // That is only true if `paused` is the *default* rather than a state JS has
    // to reach in time.
    expect(marqueeMarkup()).toContain('data-inview="false"');
    expect(globalsCss).toMatch(
      /\.motion-marquee-track \{[^}]*animation-play-state: paused;[^}]*\}/s,
    );
    expect(globalsCss).toContain(
      '.motion-marquee[data-inview="true"] .motion-marquee-track {\n    animation-play-state: running;',
    );
  });

  it("pauses on hover and on focus-within, after the in-view rule so it wins", () => {
    const running = globalsCss.indexOf('.motion-marquee[data-inview="true"]');
    const hover = globalsCss.indexOf(".motion-marquee:hover .motion-marquee-track");

    expect(running).toBeGreaterThan(-1);
    expect(hover).toBeGreaterThan(running);
    expect(globalsCss).toContain(".motion-marquee:focus-within .motion-marquee-track");
  });

  it("shifts +50% under RTL, which is the direction that has no blank band", () => {
    // Under dir="rtl" an overflowing block hangs its inline-start edge on the
    // container's right edge and spills left, so a negative translate walks the
    // track's right edge away from the container's and opens a growing gap.
    expect(globalsCss).toMatch(/\[dir="rtl"\] \.motion-marquee-track \{\s*--marquee-shift: 50%;/);
    expect(globalsCss).toMatch(/transform: translate3d\(var\(--marquee-shift\), 0, 0\);/);
  });

  it("becomes a wrapping grid under reduced motion, with the clone removed", () => {
    const reduced = globalsCss.slice(globalsCss.lastIndexOf("@media (prefers-reduced-motion"));
    expect(reduced).toContain("flex-wrap: wrap");
    expect(reduced).toContain(".motion-marquee-run[data-clone]");
    expect(reduced).toContain("display: none");
  });
});

describe("Reveal", () => {
  it("marks the block itself, and only the block, when not staggering", () => {
    const html = renderToStaticMarkup(<Reveal className="grid">x</Reveal>);
    expect(html).toBe('<div class="grid" data-reveal="">x</div>');
  });

  it("marks the container for a staggered group so its children carry the delay", () => {
    const html = renderToStaticMarkup(
      <Reveal stagger as="ul" aria-labelledby="h">
        x
      </Reveal>,
    );
    expect(html).toContain("data-reveal-stagger");
    expect(html).toContain('aria-labelledby="h"');
    // The tag is not negotiable: a staggered list has to stay a list.
    expect(html.startsWith("<ul")).toBe(true);
  });

  it("keeps travel and duration inside masterPlan §5's motion budget", () => {
    // <= 24px of travel, <= 400ms. fableTasks §P14.S7 asks for 500ms, which is
    // over the budget; --duration-slow is the longest value the budget allows.
    const travel = /--reveal-travel:\s*(\d+)px;/.exec(tokensCss);
    expect(travel).not.toBeNull();
    expect(Number(travel?.[1])).toBeLessThanOrEqual(24);
    expect(globalsCss).toContain("opacity var(--duration-slow) var(--ease-out)");
    expect(tokensCss).toMatch(/--duration-slow:\s*400ms;/);
  });

  it("staggers children 60ms apart without stamping an index onto each child", () => {
    expect(tokensCss).toMatch(/--reveal-stagger-step:\s*60ms;/);
    expect(globalsCss).toContain("[data-reveal-stagger] > :nth-child(2)");
    expect(globalsCss).toContain("[data-reveal-stagger] > :nth-child(n + 8)");
  });

  it("stays off `motion`, so it adds nothing to a route already over its JS gate", () => {
    // `/` is at 197KB against a 193KB gate and 306ms TBT against 200ms, with
    // 692 of ~936ms of long-task time in Style & Layout. Forty more
    // VisualElements to mount at hydration is exactly that cost.
    expect(read("components", "motion", "Reveal.tsx")).not.toContain("motion/react");
    expect(read("components", "motion", "Stagger.tsx")).not.toContain("motion/react");
    expect(read("components", "motion", "Marquee.tsx")).not.toContain("motion/react");
  });

  it("renders the final state, never the hidden one, under reduced motion", () => {
    // Still CSS, so it is true of the first paint rather than of whatever
    // hydration decides. It now backs up a script that already declines to arm
    // under reduced motion, and covers the two things that script cannot see: a
    // preference turned on after load, and a browser with no `matchMedia`.
    //
    // The `:root[data-reveal-armed]` prefix is not decoration. Without it this
    // override is two attribute selectors against the four in the rules it has
    // to beat, and it loses silently.
    // Anchored inside the reveal section: globals.css has seven reduced-motion
    // queries and this is not the first of them.
    const section = globalsCss.slice(
      globalsCss.indexOf("---- Enter-on-view reveals"),
      globalsCss.indexOf("---- Marquee"),
    );
    const guard = section.slice(section.indexOf("@media (prefers-reduced-motion: reduce)"));
    const body = guard.slice(0, guard.indexOf("\n  }\n"));
    expect(body).toContain(":root[data-reveal-armed] [data-reveal-stagger] > *");
    expect(body).toContain("opacity: 1;");
    expect(body).toContain("transition: none;");
  });
});

/**
 * ## The failure class this guards
 *
 * `Reveal` hides a block and an IntersectionObserver brings it back, and that
 * observer exists only after the route's JS has downloaded, parsed and hydrated
 * successfully. Hidden-by-default in CSS therefore means: a chunk 404, a throw
 * from an unrelated component, or an extension eating part of the bundle leaves
 * the whole landing page below the hero permanently at `opacity: 0`. No error
 * boundary reaches a CSS opacity, and no React effect can time out, because the
 * effect is the thing that did not run.
 *
 * `(scripting: none)` did not cover any of that -- it is a Media Queries Level 5
 * feature, unevenly supported, and it only ever described the no-JS visitor.
 *
 * So: the server-rendered page is visible, a blocking inline script opts into
 * the hidden state, and a watchdog *inside that same script* undoes it if
 * hydration never reports in. Every assertion below pins one of those three.
 */
describe("Reveal — fails open", () => {
  const revealCss = globalsCss.slice(
    globalsCss.indexOf("---- Enter-on-view reveals"),
    globalsCss.indexOf("---- Marquee"),
  );
  const revealSource = read("components", "motion", "Reveal.tsx");
  const bootMarkup = renderToStaticMarkup(<RevealBoot />);

  it("hides nothing the server rendered: every hiding rule is gated on the armed attribute", () => {
    // The invariant, stated structurally rather than by matching one string:
    // find every declaration block in the reveal section that sets opacity to
    // 0, and require each of its selectors to be behind `data-reveal-armed`.
    // Ungate one and this goes red.
    const hidingBlocks = revealCss.split("}").filter((block) => /opacity:\s*0;/.test(block));
    expect(hidingBlocks).toHaveLength(1);

    const [block] = hidingBlocks as [string];
    // Everything after the last comment close and before the brace is selector.
    const selectors = block
      .slice(block.lastIndexOf("*/") + 2, block.indexOf("{"))
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);

    expect(selectors.length).toBeGreaterThan(0);
    for (const selector of selectors) {
      expect(selector.startsWith(":root[data-reveal-armed] ")).toBe(true);
    }
  });

  it("puts nothing in the server markup that could hide it", () => {
    // The wrapper ships one inert attribute. Whether it means anything is
    // decided by `<html>`, which only a script can write.
    const html = renderToStaticMarkup(<Reveal className="grid">x</Reveal>);
    expect(html).toBe('<div class="grid" data-reveal="">x</div>');
    expect(html).not.toContain("data-reveal-armed");
    expect(html).not.toContain("opacity");
  });

  it("arms from a blocking inline script, so no script means nothing is ever hidden", () => {
    expect(bootMarkup.startsWith("<script>")).toBe(true);
    expect(bootMarkup).toContain('setAttribute("data-reveal-armed","")');
    // It declines to arm under reduced motion, so that visitor never has a
    // hidden frame or a transition to see -- not even one that CSS corrects.
    expect(bootMarkup).toContain('"(prefers-reduced-motion: reduce)"');
  });

  it("carries its own watchdog, inside the script rather than in an effect", () => {
    // A React effect cannot be the recovery path for a failure whose definition
    // is "React effects did not run".
    expect(revealSource).not.toContain("setTimeout");

    expect(bootMarkup).toContain(`},${REVEAL_WATCHDOG_MS});`);
    expect(bootMarkup).toContain('getAttribute("data-reveal-armed")!=="live"');
    expect(bootMarkup).toContain('removeAttribute("data-reveal-armed")');

    // Long enough that a slow-but-healthy hydration keeps its animation, short
    // enough that a broken one is not a blank page. 2000ms is the route's own
    // LCP budget: content must not be invisible longer than the time we allow
    // it to first appear in.
    expect(REVEAL_WATCHDOG_MS).toBeGreaterThanOrEqual(1500);
    expect(REVEAL_WATCHDOG_MS).toBeLessThanOrEqual(2000);
  });

  it("signals the watchdog only by upgrading an existing arm, never by re-arming", () => {
    // If the watchdog already fired the sections are on screen. Writing the
    // attribute unconditionally would pull them back out from under the
    // visitor, which is a worse flash than the one this whole change prevents.
    expect(revealSource).toContain("root.hasAttribute(REVEAL_ARMED_ATTR)");
    expect(revealSource).toContain("root.setAttribute(REVEAL_ARMED_ATTR, REVEAL_ARMED_LIVE)");
  });

  it("boots before any revealed content, and no longer leans on `scripting: none`", () => {
    const layout = read("app", "[locale]", "(shop)", "layout.tsx");
    expect(layout.indexOf("<RevealBoot />")).toBeGreaterThan(-1);
    expect(layout.indexOf("<RevealBoot />")).toBeLessThan(layout.indexOf("{children}"));

    // Arming after a `[data-reveal]` element had painted would show it and then
    // hide it -- the flash masterPlan.md §6.7 forbids.
    // No `@media` anywhere in the sheet still asks. Matched on the at-rule
    // rather than the bare string, because the comments above still explain
    // why it was dropped and should be free to say so.
    expect(globalsCss).not.toMatch(/@media[^{]*scripting/);
  });
});
