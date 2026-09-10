import { describe, expect, it } from "vitest";

import { landingAsset } from "@/lib/landing-image";
import { HERO_BASE_ASSET } from "./heroLayout";
import { HERO_BASE_LQIP, heroSkeletonBox, StageSkeleton } from "./StageSkeleton";

describe("the hero stage's first paint (P15.S3)", () => {
  it("registers on exactly the box the base car docks into", () => {
    // The whole mechanism depends on this. The placeholder is not removed when
    // the real render arrives -- it is covered by it -- and it is only covered
    // if it occupies the same box. A drift here does not break the page
    // loudly; it leaves a blurred second car peeking out from behind the sharp
    // one, which is the kind of defect a screenshot review reads as a
    // rendering fault rather than as a coordinate.
    const asset = landingAsset(`/landing/hero/${HERO_BASE_ASSET}`);
    expect(asset.trim, "the base render must be trimmed to carry a registration").not.toBeNull();

    expect(heroSkeletonBox()).toEqual({
      left: asset.trim?.left,
      top: asset.trim?.top,
      width: asset.intrinsic.width,
      height: asset.intrinsic.height,
    });
  });

  it("carries no scale or offset of its own, because the base car has none", () => {
    // `place()` in HeroStage reduces to the trim offsets exactly when the dock
    // is NATIVE -- scale 1, dx 0, dy 0 -- which is what heroLayout.test.ts
    // asserts for every sprite and `pnpm check:hero` re-checks against the
    // artwork. This test is the other half of that: if the base ever stops
    // docking natively, `heroSkeletonBox()` becomes wrong and silently so.
    const box = heroSkeletonBox();
    const asset = landingAsset(`/landing/hero/${HERO_BASE_ASSET}`);
    expect(box.width).toBe(asset.intrinsic.width);
    expect(box.height).toBe(asset.intrinsic.height);
  });

  it("inlines a WebP small enough to be free, and large enough to be a car", () => {
    expect(HERO_BASE_LQIP.startsWith("data:image/webp;base64,")).toBe(true);
    const bytes = Buffer.from(HERO_BASE_LQIP.split(",")[1] ?? "", "base64");

    // A data URI is paid for twice in the response: once in the server-rendered
    // markup and once in the RSC payload that hands this slot to the client
    // stage. At 410 bytes that is under a kilobyte of HTML for the page's
    // entire first paint; at ten times that it would be worth a second look,
    // which is what this ceiling is for. It is not a budget the page is near.
    expect(bytes.byteLength).toBeLessThan(1500);
    expect(bytes.byteLength).toBeGreaterThan(100);

    // RIFF....WEBP -- a real container, not a truncated paste.
    expect(bytes.subarray(0, 4).toString("ascii")).toBe("RIFF");
    expect(bytes.subarray(8, 12).toString("ascii")).toBe("WEBP");
    // The ALPH chunk. The placeholder MUST carry alpha: its transparent
    // surround is the only reason the sharp render covers it completely
    // instead of leaving a rectangle behind the car, and it is the entire
    // reason this is a copy of the render rather than a shimmer plate.
    expect(bytes.includes(Buffer.from("ALPH", "ascii"))).toBe(true);
  });
});

describe("the skeleton's markup", () => {
  it("renders the base car's box, and nothing an assistive tech will read", async () => {
    const { renderToStaticMarkup } = await import("react-dom/server");
    const box = heroSkeletonBox();
    const html = renderToStaticMarkup(StageSkeleton());
    const asPct = (n: number) => `${((n / 1024) * 100).toFixed(4)}%`;

    expect(html).toContain('aria-hidden="true"');
    // No role, no name, no landmark: the stage's own role="group"/aria-label
    // contract belongs to HeroStage and must not gain a second child that
    // announces itself.
    expect(html).not.toContain("role=");
    expect(html).not.toContain("aria-label");

    // Logical inline start, never `left` -- the stage is dir="ltr" so the two
    // resolve the same today, and writing the physical one would still be a
    // trap for the day something above it is not.
    expect(html).toContain(`inset-inline-start:${asPct(box.left)}`);
    expect(html).toContain(`top:${asPct(box.top)}`);
    expect(html).toContain(`width:${asPct(box.width)}`);
    expect(html).toContain(`height:${asPct(box.height)}`);
    expect(html).toContain("--hero-skeleton-image:url(data:image/webp;base64,");
  });
});
