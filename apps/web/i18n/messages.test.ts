import { describe, expect, it } from "vitest";

import fa from "../messages/fa.json";

import { getMessages } from "./messages.js";

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
  it("covers all eleven beats of the v1.27 inventory", () => {
    // The mega footer (beat 11) lives in the layout namespace, not here.
    expect(Object.keys(fa.Landing.beats)).toEqual([
      "hero",
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

  it("numbers the beats 01-10 in render order", () => {
    const codes = Object.values(fa.Landing.beats).map((beat) => (beat as { code: string }).code);
    expect(codes).toEqual(["01", "02", "03", "04", "05", "06", "07", "08", "09", "10"]);
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
    const en = getMessages("en") as typeof fa;
    // `beats` ships Persian-only at P9.S4; without the fallback next-intl
    // would raise a missing-message error on every /en render.
    expect(en.Landing.beats.hero.headline).toBe(fa.Landing.beats.hero.headline);
  });

  it("lets a translated key win over the Persian fallback", () => {
    const en = getMessages("en") as typeof fa;
    expect(en.Landing.sections.hero.headline).not.toBe(fa.Landing.sections.hero.headline);
  });

  it("replaces message arrays wholesale instead of splicing two languages", () => {
    const en = getMessages("en") as typeof fa;
    const symptoms = en.Landing.sections.symptomFinder.items;
    expect(new Set(symptoms).size).toBe(symptoms.length);
    expect(symptoms.some((item) => /[؀-ۿ]/.test(item))).toBe(false);
  });
});
