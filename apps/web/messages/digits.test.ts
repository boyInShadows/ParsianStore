import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * The digit policy, enforced on the locale file (fableTasks v1.1 P13.S10).
 *
 * One rule, and the audit found the page breaking it in three directions at
 * once: «۳۲ قطعه» in one place, "2007" in another, «۲۰۲۰» in a third.
 *
 *   Persian digits for anything a reader reads as a number -- quantities,
 *   prices, years, counts. Latin digits **only** inside identifiers: part
 *   codes, SKUs, `SYS-05`, plate numbers, phone-number placeholders.
 *
 * The identifier exceptions are listed rather than pattern-matched, because a
 * pattern loose enough to allow "09xxxxxxxxx" is loose enough to allow the next
 * stray "2007". Adding a key here is a deliberate act with a reason attached.
 */

const MESSAGES = path.join(path.dirname(fileURLToPath(import.meta.url)), "fa.json");

/**
 * Keys whose Latin digits are identifiers, not quantities.
 *
 * Dotted paths, matched exactly. Each one is a string a user copies, types or
 * compares against something printed -- never a number they read.
 */
const IDENTIFIER_KEYS = new Set<string>([
  // The Mechanic's path: an OEM part number, shown as an example of the thing
  // to paste in. Persian digits here would be an example nobody can paste.
  "Landing.beats.hero.mechanicPath.codePlaceholder",
  // The format a phone field expects, in the digits a numeric keyboard sends.
  "Auth.login.phonePlaceholder",
]);

/**
 * Section plate numbers: `Landing.beats.<section>.code`.
 *
 * These are the "01", "02" markers the landing page prints beside each
 * section's heading, in mono, as a workshop manual numbers its pages. They are
 * identifiers of the same kind as `SYS-05` -- you read them as a label, not as
 * a count -- and they are matched by shape rather than listed because every
 * section has one and a new section should not need a test edit to get it.
 */
const isSectionPlate = (key: string) => /^Landing.(beats|sections).[A-Za-z]+.code$/.test(key);

/** Every leaf string in the locale file, with its dotted path. */
function leaves(node: unknown, prefix = ""): [string, string][] {
  if (typeof node === "string") return [[prefix, node]];
  if (Array.isArray(node)) {
    return node.flatMap((item, index) => leaves(item, `${prefix}[${index}]`));
  }
  if (node && typeof node === "object") {
    return Object.entries(node).flatMap(([key, value]) =>
      leaves(value, prefix ? `${prefix}.${key}` : key),
    );
  }
  return [];
}

describe("the Persian locale's digit policy", () => {
  const entries = leaves(JSON.parse(readFileSync(MESSAGES, "utf8")));

  it("has strings to check", () => {
    expect(entries.length).toBeGreaterThan(100);
  });

  it("uses Persian digits everywhere a reader reads a number", () => {
    const offenders = entries
      .filter(([key, value]) => {
        // ICU placeholders are code, not copy: `{count}` and `{n}` carry a
        // value the server has already shaped, and the plural/select syntax
        // around them is Latin by definition.
        const copy = value.replace(/\{[^}]*\}/g, "");
        return /[0-9]/.test(copy) && !isIdentifier(key);
      })
      .map(([key, value]) => `${key}: ${value}`);

    expect(
      offenders,
      `These Persian strings carry Latin digits. Use Persian numerals, or add the key to ` +
        `IDENTIFIER_KEYS with a reason if the digits are part of an identifier.`,
    ).toEqual([]);
  });

  it("lists no identifier exception that has stopped existing", () => {
    // An exception for a deleted key is a rule that has quietly widened.
    const keys = new Set(entries.map(([key]) => key));
    for (const key of IDENTIFIER_KEYS) {
      expect(keys, `IDENTIFIER_KEYS names "${key}", which is no longer in fa.json`).toContain(key);
    }
  });
});

function isIdentifier(key: string) {
  return IDENTIFIER_KEYS.has(key) || isSectionPlate(key);
}
