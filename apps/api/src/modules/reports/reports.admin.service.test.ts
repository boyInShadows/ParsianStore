import { describe, expect, it } from "vitest";
import { toCsv } from "./reports.admin.service.js";
describe("report CSV", () => {
  it("emits an Excel-friendly BOM and escapes quotes, commas, and newlines", () => {
    const csv = toCsv(["name", "note"], [["لنت، جلو", 'a "quoted"\nline']]);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain('"a ""quoted""\nline"');
  });
});
