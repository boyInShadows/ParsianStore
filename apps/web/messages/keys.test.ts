import { describe, expect, it } from "vitest";
import en from "./en.json";
import fa from "./fa.json";

function flattenKeys(obj: unknown, prefix = ""): string[] {
  if (typeof obj !== "object" || obj === null) return [prefix];
  return Object.entries(obj).flatMap(([key, value]) =>
    flattenKeys(value, prefix ? `${prefix}.${key}` : key),
  );
}

describe("locale message key parity (masterPlan.md §7.1)", () => {
  it("fa.json and en.json declare exactly the same keys", () => {
    const faKeys = flattenKeys(fa).sort();
    const enKeys = flattenKeys(en).sort();
    expect(enKeys).toEqual(faKeys);
  });
});
