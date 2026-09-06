import { describe, expect, it } from "vitest";

import fa from "../messages/fa.json";

import { getMessages, mergeCatalogs } from "./messages.js";

/** Every leaf string in a message tree, keyed by its dotted path. */
function flatten(tree: unknown, prefix = ""): Record<string, string> {
  if (typeof tree === "string") return { [prefix]: tree };
  if (Array.isArray(tree)) {
    return Object.assign({}, ...tree.map((item, i) => flatten(item, `${prefix}[${i}]`)));
  }
  if (typeof tree === "object" && tree !== null) {
    return Object.assign(
      {},
      ...Object.entries(tree).map(([key, value]) =>
        flatten(value, prefix ? `${prefix}.${key}` : key),
      ),
    );
  }
  return {};
}

const BEATS = flatten(fa.Landing.beats, "Landing.beats");

describe("Landing.beats — the Phase 9 rebuild's string set", () => {
  it("covers every beat, in render order", () => {
    // The mega footer lives in the layout namespace, not here.
    //
    // `findMyPart` joined at P13.S7: the vehicle selector, the code field and
    // the system index moved out of the hero so the job card could take the
    // pinned space beside the drawing, and what they moved into is a section of
    // its own. This list is in the order page.tsx renders them, which is what
    // makes the numbering assertion below meaningful.
    expect(Object.keys(fa.Landing.beats)).toEqual([
      "hero",
      "findMyPart",
      "trustStrip",
      "bestSellers",
      "authenticityStory",
      "shopByVehicle",
      "symptomFinder",
      "interstitial",
      "brandWall",
      "deals",
      "closing",
    ]);
  });

  it("numbers the beats contiguously, in render order", () => {
    // Contiguous and derived, not a written list. The audit's own complaint was
    // that the visible numbering ran 01, 03, 04, 05, 06, —, 08, —, 10: a
    // manual-page affectation that only works when it is complete. Inserting a
    // section is exactly what breaks it, and inserting a section is exactly
    // what P13.S7 did — so the assertion is now "there are no gaps" rather than
    // a literal sequence that has to be retyped every time.
    // Only the beats that actually render carry a plate. `deals` returns null
    // until a live-deals source exists (see the component), and a number nobody
    // can see is precisely the gap the audit reported -- so it has no code, and
    // gets one on the day it renders.
    const codes = Object.values(fa.Landing.beats)
      .map((beat) => (beat as { code?: string }).code)
      .filter((code): code is string => code !== undefined);
    const expected = codes.map((_, index) => String(index + 1).padStart(2, "0"));
    expect(codes).toEqual(expected);
  });

  it("gives a plate to every beat that renders, and none to one that does not", () => {
    // The pair that keeps the numbering honest in both directions: a rendered
    // section without a plate leaves a hole in the sequence, and an unrendered
    // section with one consumes a number nobody sees.
    const withCode = Object.entries(fa.Landing.beats)
      .filter(([, beat]) => (beat as { code?: string }).code !== undefined)
      .map(([key]) => key);
    // Neither the deals section (renders null) nor the trust strip (no visible
    // heading, and four ordinals of its own directly below a plate would read
    // as the broken numbering this set out to fix).
    expect(withCode).not.toContain("deals");
    expect(withCode).not.toContain("trustStrip");
    expect(withCode).toContain("findMyPart");
    expect(withCode).toContain("closing");
  });

  it("has no empty or placeholder copy", () => {
    for (const [path, value] of Object.entries(BEATS)) {
      expect(value.trim(), path).not.toBe("");
      expect(value, path).not.toMatch(/lorem|ipsum|TODO|TBD|xxx/i);
    }
  });

  it("keeps the headline and closing CTA masterPlan §5 specifies verbatim", () => {
    expect(fa.Landing.beats.hero.headline).toBe(
      "قطعه‌ای که به خودروی شما می‌خورد، نه چیزی شبیه آن.",
    );
    expect(fa.Landing.beats.closing.cta).toBe("از خودروت شروع کن");
  });

  it("writes digits in Persian, never Latin, outside machine-readable codes", () => {
    // `code` is a mono SYS-xx-style plate number and the ICU `{count}` /
    // `{name}` placeholders are syntax -- both stay Latin by design.
    for (const [path, value] of Object.entries(BEATS)) {
      if (path.endsWith(".code")) continue;
      expect(value.replace(/\{[^}]*\}/g, ""), path).not.toMatch(/[0-9]/);
    }
  });

  it("ties every trust claim to a concrete process rather than a slogan", () => {
    expect(fa.Landing.beats.trustStrip.items).toHaveLength(4);
    for (const item of fa.Landing.beats.trustStrip.items) {
      expect(item.title.length).toBeGreaterThan(0);
      expect(item.detail.length).toBeGreaterThan(20);
    }
  });

  it("gives the four how-it-works steps of masterPlan §5-11", () => {
    expect(fa.Landing.beats.closing.steps).toHaveLength(4);
  });
});

describe("getMessages", () => {
  it("returns the Persian catalog untouched for the default locale", () => {
    expect(getMessages("fa")).toBe(fa);
  });

  it("fills a key en.json has not translated with the Persian one", () => {
    const en = getMessages("en") as unknown as typeof fa;
    // `beats` ships Persian-only at P9.S4; without the fallback next-intl
    // would raise a missing-message error on every /en render.
    expect(en.Landing.beats.hero.headline).toBe(fa.Landing.beats.hero.headline);
  });

  it("lets a translated key win over the Persian fallback", () => {
    const en = getMessages("en") as unknown as typeof fa;
    // `meta` is translated in both catalogs, so this is the fallback actually
    // stepping aside rather than never being reached.
    expect(en.Landing.meta.title).not.toBe(fa.Landing.meta.title);
    expect(en.Landing.meta.title).toMatch(/[A-Za-z]/);
  });

  it("keeps a Persian-only array intact rather than dropping it", () => {
    const en = getMessages("en") as unknown as typeof fa;
    // The rebuilt beats ship Persian-only, so an /en visitor reads Persian
    // here. Untranslated is the honest state; missing would be a broken page.
    expect(en.Landing.beats.symptomFinder.items).toEqual(fa.Landing.beats.symptomFinder.items);
  });
});

describe("mergeCatalogs", () => {
  it("replaces message arrays wholesale instead of splicing two languages", () => {
    // Index-wise merging would return ["one", "ب", "ج"] -- one list carrying
    // two languages, which is worse than either language alone.
    const merged = mergeCatalogs({ list: ["الف", "ب", "ج"] }, { list: ["one"] });
    expect(merged.list).toEqual(["one"]);
  });

  it("merges nested trees key by key instead of replacing the branch", () => {
    const merged = mergeCatalogs(
      { page: { title: "عنوان", hint: "راهنما" } },
      { page: { title: "Title" } },
    );
    expect(merged.page).toEqual({ title: "Title", hint: "راهنما" });
  });
});
