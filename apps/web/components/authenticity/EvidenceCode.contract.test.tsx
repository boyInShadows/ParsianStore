import { describe, expect, it } from "vitest";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";

import { EvidenceCode } from "./EvidenceCode.js";

/**
 * The two contracts `.evidence-code` used to carry at once (P15.S5).
 *
 * `.bidi-code` isolates a code from the Persian text around it and gives it
 * tabular figures. `.evidence-code` adds truncation, and is for the 36-45
 * character verification token alone. They were one class, and the evidence
 * that this was wrong is in the history rather than in any screenshot: P14.S9
 * had to move `tabular-nums` OUT of the component and DOWN into the shared
 * class to reach three call sites that were never verification codes -- while
 * the truncation half of the same class stayed inert on all three, because it
 * was never in the class at all, only in the component's utility list.
 *
 * These assertions are what stops it merging back. They are deliberately about
 * the SOURCE: `e2e/landing-sections.spec.ts` covers the same contracts as
 * computed style in a browser, and neither test can replace the other -- a
 * source test cannot see that `text-overflow` does nothing without `overflow:
 * hidden`, and a browser test cannot see a second call site quietly
 * hand-writing the class.
 */

const WEB_ROOT = path.resolve(import.meta.dirname, "..", "..");

/** The declarations inside one rule of globals.css, by selector. */
async function ruleBody(selector: string): Promise<string> {
  const css = await readFile(path.join(WEB_ROOT, "styles", "globals.css"), "utf8");
  // Comments above these rules discuss the other class by name, so the search
  // is for the selector followed by its brace, and the prose is stripped from
  // whatever comes back -- otherwise a mention counts as a declaration.
  const start = css.indexOf(`${selector} {`);
  expect(start, `${selector} is not defined in styles/globals.css`).toBeGreaterThan(-1);
  const open = css.indexOf("{", start);
  const close = css.indexOf("}", open);
  return css.slice(open + 1, close).replace(/\/\*[\s\S]*?\*\//g, "");
}

async function walk(dir: string): Promise<string[]> {
  const found: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...(await walk(full)));
    else if (/\.tsx?$/.test(entry.name)) found.push(full);
  }
  return found;
}

/**
 * The classes on the rendered root, or a loud failure. `noUncheckedIndexedAccess`
 * sees the capture group as `string | undefined` because it cannot tell a
 * matched group from a missing one -- but a component that stops emitting a
 * `class` attribute (or emits an empty one that fails to match at all) is
 * exactly the regression these tests exist to catch, so that case must fail
 * the assertion, not fall back to `[]` and let every `toContain` pass vacuously.
 */
function classesOf(html: string): string[] {
  const match = /class="([^"]*)"/.exec(html);
  expect(match, "expected a class attribute in the rendered markup").not.toBeNull();
  const classAttr = match![1];
  expect(classAttr, "expected the class attribute to have a captured value").toBeDefined();
  return classAttr!.split(/\s+/);
}

describe(".bidi-code -- the primitive", () => {
  it("isolates the run and sets tabular figures", async () => {
    const body = await ruleBody(".bidi-code");
    expect(body).toMatch(/unicode-bidi:\s*isolate/);
    expect(body).toMatch(/font-variant-numeric:\s*tabular-nums/);
  });

  it("carries none of the truncation machinery", async () => {
    // The whole point of the split: three call sites stamp `SYS-10` or a model
    // year and must never clip. If clipping reaches this class it reaches them.
    const body = await ruleBody(".bidi-code");
    for (const property of ["text-overflow", "white-space", "overflow", "max-width", "display"]) {
      expect(body, `.bidi-code must not set ${property}`).not.toContain(property);
    }
  });
});

describe(".evidence-code -- the verification-token contract", () => {
  it("clips to one line without shortening anything", async () => {
    const body = await ruleBody(".evidence-code");
    // All four together, or the ellipsis never appears: `text-overflow` needs
    // a non-visible overflow and a line that cannot wrap, on a box that has a
    // width to overflow.
    expect(body).toMatch(/display:\s*inline-block/);
    expect(body).toMatch(/max-width:\s*100%/);
    expect(body).toMatch(/overflow:\s*hidden/);
    expect(body).toMatch(/white-space:\s*nowrap/);
    expect(body).toMatch(/text-overflow:\s*ellipsis/);
  });

  it("does not restate the primitive", async () => {
    const body = await ruleBody(".evidence-code");
    expect(body).not.toContain("unicode-bidi");
    expect(body).not.toContain("font-variant-numeric");
  });
});

describe("EvidenceCode", () => {
  const CODE = "VER-SKU-ENGINE-CYLINDER-HEAD-GASKET-PRIDE-111";

  it("composes both classes rather than one of them", () => {
    const html = renderToStaticMarkup(<EvidenceCode code={CODE} />);
    const classes = classesOf(html);
    expect(classes).toContain("bidi-code");
    expect(classes).toContain("evidence-code");
  });

  it("keeps the whole code in the DOM and in the title", () => {
    // Truncation is visual only. Shortening the string here would defeat the
    // one thing a verification code is for.
    const html = renderToStaticMarkup(<EvidenceCode code={CODE} />);
    expect(html).toContain(`>${CODE}<`);
    expect(html).toContain(`title="${CODE}"`);
    expect(html).toContain('dir="ltr"');
  });

  it("spells the contract in the stylesheet, not as utilities", () => {
    // P14.S9 left `tabular-nums` declared twice -- once on the class it had
    // just been moved to, once as the utility it was moved from. Every
    // utility below is now a declaration in globals.css; a duplicate here is
    // the class and the component disagreeing about who owns the contract.
    const html = renderToStaticMarkup(<EvidenceCode code={CODE} />);
    const classes = classesOf(html);
    for (const utility of [
      "tabular-nums",
      "truncate",
      "inline-block",
      "max-w-full",
      "align-bottom",
    ]) {
      expect(classes, `${utility} is redundant with .evidence-code`).not.toContain(utility);
    }
  });
});

describe("the class split holds across the tree", () => {
  it("gives .evidence-code exactly one holder", async () => {
    // A short stamped identifier that reaches for this class gets clipping it
    // does not want and loses isolation it does. `bidi-code` is the one to
    // hand-write; this one belongs to the component.
    const files = [
      ...(await walk(path.join(WEB_ROOT, "components"))),
      ...(await walk(path.join(WEB_ROOT, "app"))),
    ];
    const holders: string[] = [];
    for (const file of files) {
      if (/EvidenceCode\.(tsx|contract\.test\.tsx)$/.test(file)) continue;
      if (/\bevidence-code\b/.test(await readFile(file, "utf8"))) {
        holders.push(path.relative(WEB_ROOT, file).split(path.sep).join("/"));
      }
    }
    expect(holders, "these hand-write .evidence-code; they want .bidi-code").toEqual([]);
  });

  it("keeps every short-identifier call site on the primitive", async () => {
    // The three the split was made for. Named rather than counted: a count
    // goes stale silently, and this bullet shipped believing there were two
    // component call sites when there are three.
    for (const rel of [
      "components/landing/FindMyPart.tsx",
      "components/landing/HeroV2/PartCallout.tsx",
      "components/landing/ShopByVehicle.tsx",
    ]) {
      const source = await readFile(path.join(WEB_ROOT, rel), "utf8");
      expect(source, `${rel} lost its bidi isolation`).toMatch(/\bbidi-code\b/);
    }
  });
});
