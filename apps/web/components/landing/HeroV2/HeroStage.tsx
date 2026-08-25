import { landingAsset } from "@/lib/landing-image";
import { LandingImage } from "../LandingImage";
import {
  HERO_BASE_ASSET,
  HERO_CANVAS,
  HERO_FRAME_WIDTH_PCT,
  HERO_LAYERS,
  HERO_PERSPECTIVE_CQW,
  type HeroClip,
  type HeroDock,
  type HeroLayer,
} from "./heroLayout";

type Props = {
  /** Accessible name for the whole diagram. */
  label: string;
  /** Alt text for the assembled vehicle the layers add up to. */
  carAlt: string;
};

/** Roughly how wide the stage itself is, for `sizes`. */
const STAGE_VW = { desktop: 55, mobile: 92 } as const;

const pct = (value: number) => `${((value / HERO_CANVAS) * 100).toFixed(4)}%`;

/**
 * Where a layer's box lands on the canvas, from the trim offsets the pipeline
 * recorded plus this layer's calibration.
 *
 * The scale is taken about the box's own centre -- `(intrinsic - scaled) / 2`
 * is that recentring. Scaling from the top-left corner instead would drag every
 * resized part up and to the start side, which is what makes a "just make it
 * smaller" nudge move a part that was already in the right place.
 */
function place(assetName: string, dock: HeroDock) {
  const asset = landingAsset(`/landing/hero/${assetName}`);
  if (!asset.trim) {
    throw new Error(
      `Hero layer "${assetName}" is untrimmed, so it carries no registration. ` +
        `Re-run \`pnpm optimize:landing\` -- the hero group must trim (scripts/optimize-landing.mjs).`,
    );
  }
  const width = asset.intrinsic.width * dock.scale;
  const height = asset.intrinsic.height * dock.scale;
  return {
    width,
    height,
    left: asset.trim.left + (asset.intrinsic.width - width) / 2 + dock.dx,
    top: asset.trim.top + (asset.intrinsic.height - height) / 2 + dock.dy,
  };
}

/** The layer's rendered width in viewport terms, so `srcset` picks a real rung. */
function sizesFor(width: number) {
  const share = (width / HERO_CANVAS) * (HERO_FRAME_WIDTH_PCT / 100);
  const desktop = Math.max(1, Math.round(share * STAGE_VW.desktop));
  const mobile = Math.max(1, Math.round(share * STAGE_VW.mobile));
  return `(min-width: 1024px) ${desktop}vw, ${mobile}vw`;
}

function transformFor(dock: HeroDock) {
  // Always all three, always in this order: an undock animation interpolates
  // between two transform strings, and the browser only interpolates them
  // componentwise when the function lists match.
  return (
    `rotateX(${dock.rotateX ?? 0}deg) ` +
    `rotateY(${dock.rotateY ?? 0}deg) ` +
    `rotateZ(${dock.rotateZ ?? 0}deg)`
  );
}

function clipFor(clip: HeroClip | undefined) {
  return clip ? `inset(${clip.top}% ${clip.right}% ${clip.bottom}% ${clip.left}%)` : undefined;
}

function Layer({ layer, index }: { layer: HeroLayer; index: number }) {
  const box = place(layer.asset, layer.dock);
  return (
    <LandingImage
      src={`/landing/hero/${layer.asset}`}
      alt=""
      sizes={sizesFor(box.width)}
      className="absolute"
      style={{
        insetInlineStart: pct(box.left),
        top: pct(box.top),
        width: pct(box.width),
        height: "auto",
        transform: transformFor(layer.dock),
        clipPath: clipFor(layer.clip),
        zIndex: index + 2,
      }}
    />
  );
}

/**
 * The hero's vehicle: a stripped body with seven parts docked back onto it, so
 * what the page opens with is a *complete* car (fableTasks §3.2).
 *
 * A server component, and that is the point of this step. The v1 stage was a
 * client leaf whose whole job was to hold nine parts collapsed inside the car
 * until scroll pulled them out; the docked model has a correct, finished first
 * frame, so the resting composition needs no JavaScript at all. Part 3 adds
 * the undock motion back on top of exactly this markup.
 *
 * `dir="ltr"` on the stage is deliberate and is not a physical-direction
 * violation (CLAUDE.md §6): every layer is positioned with `insetInlineStart`,
 * and the renders are never mirrored, so in Persian the sprites would mirror
 * around a car that does not -- a bumper docking onto the rear. The car is an
 * object, not text, so the object's own frame is pinned while the page around
 * it stays RTL.
 */
export function HeroStage({ label, carAlt }: Props) {
  const base = place(HERO_BASE_ASSET, { dx: 0, dy: 0, scale: 1 });

  return (
    <div
      role="group"
      aria-label={label}
      dir="ltr"
      className="hero-stage relative aspect-[16/11] w-full"
      // The container-query context the frame's `perspective` measures against.
      style={{ containerType: "inline-size" }}
    >
      {/* The 1024² master frame, centred in the stage. Every layer inside is
          positioned as a percentage of THIS box, which is what makes the trim
          offsets the pipeline recorded usable as dock coordinates.

          `perspective` belongs here and nowhere else: one shared camera for
          all eight layers. Written per layer it would give each sprite its own
          vanishing point, and the composite would stop reading as one car. */}
      <div
        className="absolute aspect-square"
        style={{
          insetInlineStart: "50%",
          top: "50%",
          width: `${HERO_FRAME_WIDTH_PCT}%`,
          transform: "translate(-50%, -50%)",
          perspective: `${HERO_PERSPECTIVE_CQW}cqw`,
          transformStyle: "preserve-3d",
        }}
      >
        <LandingImage
          src={`/landing/hero/${HERO_BASE_ASSET}`}
          alt={carAlt}
          sizes={sizesFor(base.width)}
          priority
          className="absolute"
          style={{
            insetInlineStart: pct(base.left),
            top: pct(base.top),
            width: pct(base.width),
            height: "auto",
            zIndex: 1,
          }}
        />
        {HERO_LAYERS.map((layer, index) => (
          <Layer key={layer.id} layer={layer} index={index} />
        ))}
      </div>
    </div>
  );
}
