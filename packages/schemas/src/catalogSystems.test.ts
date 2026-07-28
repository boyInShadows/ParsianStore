import { describe, expect, it } from "vitest";
import { CATALOG_SYSTEM_CODES, CATALOG_SYSTEMS } from "./catalogSystems.js";

describe("CATALOG_SYSTEMS", () => {
  it("has at least 8 systems (P3.S7 needs >= 8 categories)", () => {
    expect(CATALOG_SYSTEMS.length).toBeGreaterThanOrEqual(8);
  });

  it("fixes SYS-04 to brakes, per masterPlan.md §1.3's own worked example", () => {
    const brakes = CATALOG_SYSTEMS.find((system) => system.code === "SYS-04");
    expect(brakes?.name.fa).toBe("ترمز");
  });

  it("has unique codes and unique slugs", () => {
    const codes = CATALOG_SYSTEMS.map((s) => s.code);
    const slugs = CATALOG_SYSTEMS.map((s) => s.slug);
    expect(new Set(codes).size).toBe(codes.length);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("every code matches the SYS-xx shape", () => {
    for (const system of CATALOG_SYSTEMS) {
      expect(system.code).toMatch(/^SYS-\d{2}$/);
    }
  });

  it("CATALOG_SYSTEM_CODES mirrors CATALOG_SYSTEMS in the same order", () => {
    expect(CATALOG_SYSTEM_CODES).toEqual(CATALOG_SYSTEMS.map((s) => s.code));
  });
});
