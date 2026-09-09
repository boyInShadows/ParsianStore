import type { CSSProperties } from "react";
import { landingAsset } from "@/lib/landing-image";
import { HERO_BASE_ASSET, HERO_CANVAS } from "./heroLayout";

/**
 * The hero stage's first paint (P15.S3).
 *
 * ## What the visitor saw before this
 *
 * `HeroStage` is a Client Component, so Next still server-renders its markup:
 * the `.hero-stage` box and the eager base-car `<img>` are both in the HTML
 * response body already. What was NOT there was anything to look at while that
 * image travelled the wire. On a mid-tier Android over an Iranian mobile
 * network the stage is an empty dark plate for as long as `car-stripped` takes
 * to arrive -- 20 KB of AVIF, and it is this page's LCP element.
 *
 * ## Why this is the base render and not a grey box
 *
 * The step's brief proposed a shimmer plate underneath the car, "removed" by
 * the real image painting on top of it. **That mechanism does not work on this
 * stage**, and the reason is worth writing down: every hero sprite is a masked
 * cut with a transparent surround, so a RECTANGLE painted under the car is
 * never covered by the car. It stays visible around it, permanently, and the
 * page acquires a grey box behind its own artwork.
 *
 * A low-resolution copy of the same render does not have that problem, because
 * its alpha channel IS the car's alpha channel. Everything it paints is exactly
 * where the sharp render will paint, so the sharp render covers it completely
 * and there is nothing left to remove. That is what makes this genuinely
 * zero-JS: not a timer, not an `onLoad`, not a mount gate -- the placeholder is
 * retired by being underneath its own replacement.
 *
 * It is also the honest reading of the step's title. A skeleton draws a box the
 * shape of content that has not arrived; this draws the content, badly. Nothing
 * about the first paint has to be taken back afterwards.
 *
 * ## Where it renders
 *
 * A slot passed into `HeroStage`, the same way the callout plates, the bloom
 * and the leader lines already are -- a Client Component cannot render a Server
 * Component but can receive one as a prop. It goes INSIDE the 1024² master
 * frame, because that is the only coordinate space the base image's
 * registration means anything in: as a sibling of the stage its percentages
 * would resolve against the stage's own box instead, which is the up-to-40px
 * error `PartCallout` documents at length.
 *
 * ## The image, and how to regenerate it
 *
 * 32x14 WebP with alpha, 410 bytes, inline as a data URI so it costs **zero
 * network requests** -- a placeholder that needs a round trip is a placeholder
 * that arrives with the thing it was standing in for. Cut from the committed
 * optimizer output rather than from the 113 MB master, so it cannot disagree
 * with the asset the stage actually loads:
 *
 *     node -e "const s=require('sharp');(async()=>{const b=await
 *       s('apps/web/public/landing/hero/car-stripped-823.webp')
 *        .resize({width:32}).webp({quality:55,alphaQuality:70,effort:6})
 *        .toBuffer();console.log(Buffer.from(b).toString('base64'))})()"
 *
 * A constant rather than a build step, because the base render changes about
 * once a phase and a pipeline stage that runs on every build to emit 410
 * unchanging bytes is a pipeline stage nobody will maintain. If `car-stripped`
 * is ever re-cut, re-run the line above. `optimize-landing.mjs` does write a
 * real 96w variant (1,808 bytes) that would have served -- it was rejected for
 * the round trip, which is the entire thing this is trying to get in front of.
 */
export const HERO_BASE_LQIP =
  "data:image/webp;base64,UklGRpIBAABXRUJQVlA4WAoAAAAQAAAAHwAADQAAQUxQSJIAAAARf6CgbSM3dgD2vvuPiABmT1k254/YDKfVti3L+6OZQyI6nURyaZoYgz+TGEAHYAC3Nbw6TODuz+//ChH9nwCSTA12+33LTfIZ6wMALDKsjl6irVbCM1tX/yJ0cuna8g+lhw9UTn9qslc1xrMaTf6toB07b4kuAA5/oOAkSnmJKvCZzH1AT7IhhojFgZGTnMVJGlZQOCDaAAAAcAQAnQEqIAAOAD7BTqJLJ6QjIbAIAPAYCWkABRAe2DNBe+S0AMzO5b8C6sAA/vQwmNmbFtB4552eln+EqjJJud3ozaKWbDy/P0VTtz4vMyRBtN8nk/je3/DYfd0vPjGbI4jB7UUlXKH7rIk6fl1/EMfe1P/liFMQAGN+g/UjWCyfAkSfzyv7vnZzwtxNy381F6q4Qy9H/aDoL9r0z4asiKN1MrR9L0DQPcEBO7woOiypxjFjuWuXPUAufrKZR2J/Fmp42gDdQUIjxUf3WxhLpj4CwjhxizyAAAA=";

/**
 * The placeholder's box on the 1024² master canvas, in canvas units.
 *
 * The base car docks at NATIVE registration -- scale 1, dx 0, dy 0 -- which
 * `heroLayout.test.ts` asserts for every hero sprite and `pnpm check:hero`
 * re-checks against the artwork. At scale 1 `HeroStage`'s `place()` reduces to
 * exactly this: the trim offsets the pipeline recorded, plus the asset's own
 * intrinsic size. Derived from the same manifest entry the real `<img>` reads
 * rather than copied out of it, so a re-cut base render moves both or neither.
 */
export function heroSkeletonBox() {
  const asset = landingAsset(`/landing/hero/${HERO_BASE_ASSET}`);
  if (!asset.trim) {
    throw new Error(
      `Hero base asset "${HERO_BASE_ASSET}" is untrimmed, so it carries no registration. ` +
        `Re-run \`pnpm optimize:landing\` -- the hero group must trim (scripts/optimize-landing.mjs).`,
    );
  }
  return {
    left: asset.trim.left,
    top: asset.trim.top,
    width: asset.intrinsic.width,
    height: asset.intrinsic.height,
  };
}

/** Canvas units to a percentage of the 1024² master frame -- HeroStage's `pct`. */
const pct = (value: number) => `${((value / HERO_CANVAS) * 100).toFixed(4)}%`;

/**
 * Server Component, zero client JavaScript -- and that is a budget constraint,
 * not a preference. `stageSkeleton.test.ts` asserts it stays one.
 *
 * `aria-hidden`, with no role, no name and no landmark: the stage's
 * `role="group"` / `aria-label` contract belongs to `HeroStage`, and there is
 * nothing here for assistive tech to read that the base car's own `alt` does
 * not already say better.
 *
 * The image travels as a custom property rather than as an `<img>` src, the
 * same shape `.hero-sweep` uses for its mask. Two reasons: a background at
 * `100% 100%` fills the box exactly, where an `<img>` would carry the 2% aspect
 * error that rounding 823x367 down to 32x14 introduces -- about 7px of vertical
 * misregistration at desktop size -- and it keeps geometry and artwork on one
 * element instead of a wrapper plus a child.
 */
export function StageSkeleton() {
  const box = heroSkeletonBox();
  return (
    <div
      className="hero-skeleton"
      aria-hidden="true"
      style={
        {
          "--hero-skeleton-image": `url(${HERO_BASE_LQIP})`,
          insetInlineStart: pct(box.left),
          top: pct(box.top),
          width: pct(box.width),
          height: pct(box.height),
        } as CSSProperties
      }
    />
  );
}
