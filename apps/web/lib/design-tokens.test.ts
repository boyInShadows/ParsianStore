import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { contrastRatio, readThemes } from "./design-tokens.js";

const WEB_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const read = (...segments: string[]) => readFileSync(path.join(WEB_ROOT, ...segments), "utf8");

// Read from the file rather than through getDesignTokens(): that resolves
// tokens.css against process.cwd(), which is apps/web under next and the repo
// root under vitest. Same parser and the same luminance formula either way --
// there is one of each in this repo and this is it, not a second copy.
const { light, dark } = readThemes(read("styles", "tokens.css"));

const THEMES = [
  ["light", light],
  ["dark", dark],
] as const;

/**
 * ## The failure class this guards
 *
 * `--stage` does not flip with the theme, so a light-theme review of the hero
 * looks identical to a dark-theme one. Put a token that DOES flip on top of
 * it and one of the two themes can fall through its contrast floor with
 * nothing to show for it -- no visual diff, no screenshot, no axe run, because
 * axe never sees the light theme of a surface that does not have one.
 *
 * It has happened twice. `.hero-callout-go` painted `var(--brand)`, which is
 * steel-700 in light theme: 2.51:1 on the stage, unreadable from the day the
 * plate shipped and fixed in P14.S2 by minting `--stage-link`. Then
 * `.hero-callout-plate:focus-visible` painted `var(--brand-solid)` -- #1e52d6
 * in light, **2.86:1**, under SC 1.4.11's 3:1 floor for a focus indicator --
 * which is what the first run of this test found.
 *
 * So there are two assertions here, and the second is the load-bearing one.
 * The ratio table below fixes the floors for the tokens we know about; the
 * source scan afterwards is what catches the next token that arrives.
 */
const STAGE_PAIRS: { fg: string; bg: string; min: number; role: string }[] = [
  // SC 1.4.3 body text: 4.5:1. `stage-text-faint` carries mono part codes and
  // hint labels -- small, but text, so it is held to the text floor too.
  { fg: "stage-text", bg: "stage", min: 4.5, role: "plate headings, the strong line" },
  { fg: "stage-text-muted", bg: "stage", min: 4.5, role: "plate running copy" },
  { fg: "stage-text-faint", bg: "stage", min: 4.5, role: "plate labels and part codes" },
  { fg: "cta", bg: "stage", min: 4.5, role: "marigold ordinals on the plate" },
  // Both a text colour (.hero-callout-go, the closing beat's contact links)
  // and the plate's hover/focus-visible border. The text floor is the higher
  // of the two, so holding it here covers the 3:1 non-text floor as well.
  { fg: "stage-link", bg: "stage", min: 4.5, role: "links on the plate, and its focus edge" },
];

describe("stage token contrast", () => {
  it.each(STAGE_PAIRS)("--$fg on --$bg clears $min:1 in both themes — $role", (pair) => {
    for (const [theme, vars] of THEMES) {
      const fg = vars[pair.fg];
      const bg = vars[pair.bg];
      // A missing token fails rather than skips: renaming or deleting one must
      // not quietly turn this guard off.
      expect(fg, `--${pair.fg} is missing from the ${theme} theme`).toBeDefined();
      expect(bg, `--${pair.bg} is missing from the ${theme} theme`).toBeDefined();

      const ratio = contrastRatio(fg ?? "", bg ?? "");
      expect(ratio, `--${pair.fg} on --${pair.bg} is not a hex pair in ${theme}`).not.toBeNull();
      // `?? 0` only satisfies the type -- the assertion above already failed if
      // it were null.
      expect(
        ratio ?? 0,
        `--${pair.fg} on --${pair.bg} in ${theme} theme (${fg ?? "?"} on ${bg ?? "?"})`,
      ).toBeGreaterThanOrEqual(pair.min);
    }
  });

  /**
   * The premise every ratio above rests on. "Both themes" only means anything
   * while the stage itself is theme-independent: add a `--stage` override to
   * the dark block and the ground under all of them moves, and tokens.css's
   * own claim that these six do not flip becomes false.
   */
  it("keeps the whole stage group out of the dark block", () => {
    for (const name of [
      "stage",
      "stage-border",
      "stage-text",
      "stage-text-muted",
      "stage-text-faint",
      "stage-link",
    ]) {
      expect(dark[name], `--${name} must not flip with the theme`).toBe(light[name]);
    }
  });
});

/** Every `--token` referenced by a `var()` inside `body`. */
function varsUsedIn(body: string): string[] {
  return [...body.matchAll(/var\(\s*--([\w-]+)/g)].map(([, name]) => name ?? "");
}

/**
 * Rules in globals.css whose selector names a callout plate or the finale --
 * the text-bearing, focusable surfaces on the stage, which are the ones SC
 * 1.4.3 and 1.4.11 actually govern. A crude scan rather than a CSS parser,
 * for the same reason lib/design-tokens.ts uses one: a single file, ours,
 * with no nested braces inside a declaration block.
 *
 * Deliberately NOT every `.hero-*` rule. `.hero-stage img[data-highlight]`
 * paints a `drop-shadow` glow with --brand-solid, which does flip, and in
 * light theme that glow is 2.86:1 on the stage for the same arithmetic as the
 * border above -- but a decorative highlight around a sprite is not a
 * contrast-governed indicator, and re-colouring it is a visual decision
 * nobody has taken. Widen this pattern on the day that decision is made.
 *
 * `.hero-skeleton` joined at P15.S3. It paints a placeholder image on the
 * stage and reads three `--loader-*` values; two of that block's tokens
 * (--loader-ink, --loader-track) are theme-following aliases, so this scan is
 * what keeps one of them from being reached for here later. Note the one thing
 * it cannot see: the comparison below is on the two blocks' literal values, so
 * a token written as `var(--brand-solid)` -- which resolves differently per
 * theme -- reads to it as "shared". tokens.css says so beside those two.
 */
function stageRules(source: string): { selector: string; body: string }[] {
  // Comments first, or a rule's selector reads as its entire preceding
  // comment block -- which is only cosmetic, but the selector is this scan's
  // test name and its failure message, so it has to be the selector.
  const css = source.replace(/\/\*[\s\S]*?\*\//g, "");
  const rules: { selector: string; body: string }[] = [];
  for (const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = (match[1] ?? "").replace(/\s+/g, " ").trim();
    const body = match[2] ?? "";
    if (/\.hero-callout|\.hero-finale|\.hero-skeleton/.test(selector))
      rules.push({ selector, body });
  }
  return rules;
}

describe("nothing that flips with the theme may paint on the stage", () => {
  const rules = stageRules(read("styles", "globals.css"));

  it("finds the stage rules it is meant to be scanning", () => {
    // Without this the scan could pass by matching nothing at all -- a renamed
    // class would disarm it silently, which is the exact way a guard rots.
    expect(rules.length).toBeGreaterThanOrEqual(5);
    expect(rules.map((rule) => rule.selector).join(" ")).toContain("hero-callout-plate");
  });

  it.each(rules)("$selector", ({ selector, body }) => {
    for (const name of varsUsedIn(body)) {
      // A token this file does not define is a Tailwind-side or built-in value,
      // not a themed colour; nothing to compare.
      if (!(name in light)) continue;
      expect(
        dark[name],
        `${selector} paints --${name}, which flips between themes (${light[name] ?? "?"} light, ` +
          `${dark[name] ?? "?"} dark). The stage does not flip, so one of those two lands on a ` +
          `ground it was never checked against. Use a --stage-* token.`,
      ).toBe(light[name]);
    }
  });
});
