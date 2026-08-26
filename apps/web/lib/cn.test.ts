import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { cn, CN_COLORS, CN_DURATIONS, CN_FONT_SIZES } from "./cn.js";

const WEB_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("cn", () => {
  it("joins class names and drops falsy values", () => {
    // Read from a variable, not written as a literal `false && …`: that
    // form is a constant expression and ESLint rejects it outright.
    const disabled = false;
    expect(cn("a", disabled && "b", null, undefined, "c")).toBe("a c");
  });

  it("supports clsx's object and array forms", () => {
    expect(cn(["a", { b: true, c: false }])).toBe("a b");
  });

  // The whole reason cn() exists rather than a template string: a caller's
  // className has to be able to REPLACE a base class, not merely sit beside
  // it and lose on source order.
  it("lets a caller override a base utility", () => {
    expect(cn("bg-brand-solid", "bg-surface")).toBe("bg-surface");
    expect(cn("rounded-md", "rounded-full")).toBe("rounded-full");
    expect(cn("p-4", "p-6")).toBe("p-6");
    expect(cn("min-h-12", "min-h-16")).toBe("min-h-16");
    expect(cn("shadow-sm", "shadow-md")).toBe("shadow-md");
  });

  it("resolves logical spacing utilities from tailwindcss-logical", () => {
    expect(cn("ps-4", "ps-6")).toBe("ps-6");
    expect(cn("me-2", "me-4")).toBe("me-4");
  });

  /**
   * The defect this configuration exists to prevent. Out of the box,
   * tailwind-merge's `theme.colors` matches ANY value, so every `text-*`
   * utility is classified as a colour -- and a size + colour pair collapses
   * to just the colour. `text-body-sm text-text-muted` would have silently
   * lost its font size on every component that uses cn().
   */
  it("keeps a font size and a text colour together", () => {
    expect(cn("text-body-sm", "text-text-muted")).toBe("text-body-sm text-text-muted");
    expect(cn("text-display-1", "text-brand")).toBe("text-display-1 text-brand");
    expect(cn("text-caption", "text-price")).toBe("text-caption text-price");
    // `data` is a font size, `danger` a colour -- names close enough that a
    // prefix-based guess would get them wrong.
    expect(cn("text-data", "text-danger")).toBe("text-data text-danger");
  });

  it("still merges two font sizes, and two text colours", () => {
    expect(cn("text-body-sm", "text-body")).toBe("text-body");
    expect(cn("text-h2", "text-display-2")).toBe("text-display-2");
    expect(cn("text-text-muted", "text-brand")).toBe("text-brand");
    expect(cn("text-success-fg", "text-danger-fg")).toBe("text-danger-fg");
  });

  it("does not confuse text alignment with size or colour", () => {
    expect(cn("text-start", "text-end")).toBe("text-end");
    expect(cn("text-body-sm text-text-muted", "text-end")).toBe(
      "text-body-sm text-text-muted text-end",
    );
  });

  /**
   * fontSize, borderRadius and transitionDuration are EXTENDED in
   * tailwind.config.js, not replaced, so Tailwind still emits the stock
   * steps. Overriding those groups instead of extending them would leave
   * these unrecognised and silently unmergeable.
   */
  it("still merges the stock scales the config only extended", () => {
    expect(cn("text-xs", "text-lg")).toBe("text-lg");
    expect(cn("text-xs", "text-brand")).toBe("text-xs text-brand");
    expect(cn("duration-150", "duration-300")).toBe("duration-300");
    expect(cn("duration-150", "duration-fast")).toBe("duration-fast");
    expect(cn("rounded-md", "rounded-2xl")).toBe("rounded-2xl");
    expect(cn("rounded-2xl", "rounded-none")).toBe("rounded-none");
  });

  it("merges the named tokens Tailwind's stock scales do not cover", () => {
    expect(cn("duration-fast", "duration-base")).toBe("duration-base");
    expect(cn("w-rail", "w-12")).toBe("w-12");
    expect(cn("basis-rail", "basis-full")).toBe("basis-full");
    expect(cn("max-w-container", "max-w-full")).toBe("max-w-full");
  });

  it("merges colours across every utility that takes one", () => {
    expect(cn("border-border", "border-rule")).toBe("border-rule");
    expect(cn("ring-focus", "ring-brand")).toBe("ring-brand");
    expect(cn("bg-surface-raised", "bg-surface-sunken")).toBe("bg-surface-sunken");
  });

  // A border colour and a border width are different groups; collapsing them
  // would silently unstyle every outlined control.
  it("keeps border width and border colour together", () => {
    expect(cn("border", "border-border")).toBe("border border-border");
  });
});

/**
 * cn.ts has to carry literal copies of the scales, because it runs in the
 * browser and tailwind.config.js cannot be read there. These tests are what
 * stop the copy drifting from the source: add a colour or a type step to the
 * config without updating cn.ts and this fails, rather than the mismatch
 * surfacing later as a class that silently refuses to merge.
 */
describe("cn scales mirror tailwind.config.js", () => {
  const config = readFileSync(path.join(WEB_ROOT, "tailwind.config.js"), "utf8");

  /** Pull one `key: { ... }` block out of the config source. */
  function block(name: string, indent: number): string {
    const pattern = new RegExp(`\\n\\s{${indent}}${name}: \\{([\\s\\S]*?)\\n\\s{${indent}}\\},`);
    const found = pattern.exec(config)?.[1];
    expect(found, `could not locate \`${name}\` in tailwind.config.js`).toBeDefined();
    return found ?? "";
  }

  it("font sizes match theme.extend.fontSize", () => {
    const keys = [...block("fontSize", 6).matchAll(/\n\s{8}"?([\w-]+)"?:/g)].map((m) => m[1]);
    expect(keys.length).toBeGreaterThan(0);
    expect([...CN_FONT_SIZES].sort()).toEqual(keys.sort());
  });

  it("durations match theme.extend.transitionDuration", () => {
    const keys = [...block("transitionDuration", 6).matchAll(/\n\s{8}"?([\w-]+)"?:/g)].map(
      (m) => m[1],
    );
    expect([...CN_DURATIONS].sort()).toEqual(keys.sort());
  });

  it("colours match theme.colors, ramps flattened", () => {
    // theme.colors sits at indent 4 and nests the three ramps one level in.
    const colors = block("colors", 4);
    const names: string[] = [];
    let ramp: string | null = null;
    for (const line of colors.split("\n")) {
      const nested = /^\s{6}"?([\w-]+)"?: \{/.exec(line);
      if (nested) {
        ramp = nested[1] ?? null;
        continue;
      }
      if (/^\s{6}\},/.test(line)) {
        ramp = null;
        continue;
      }
      const entry = /^\s{6,8}"?([\w-]+)"?:/.exec(line);
      if (!entry?.[1]) continue;
      names.push(ramp ? `${ramp}-${entry[1]}` : entry[1]);
    }
    // `transparent` and `current` are Tailwind keywords tailwind-merge
    // already knows; everything else must be declared.
    const expected = names.filter((name) => name !== "transparent" && name !== "current");
    expect(expected.length).toBeGreaterThan(30);
    expect([...CN_COLORS].sort()).toEqual(expected.sort());
  });
});
