import { describe, expect, it } from "vitest";
import { hashToken, parseDurationMs } from "./token.js";

describe("hashToken", () => {
  it("is deterministic — same input always hashes the same, so it can be looked up by value", () => {
    expect(hashToken("abc123")).toBe(hashToken("abc123"));
  });

  it("produces different hashes for different inputs", () => {
    expect(hashToken("abc123")).not.toBe(hashToken("abc124"));
  });

  it("never returns the raw token itself", () => {
    expect(hashToken("my-secret-token")).not.toContain("my-secret-token");
  });
});

describe("parseDurationMs", () => {
  it.each([
    ["15m", 15 * 60_000],
    ["30d", 30 * 86_400_000],
    ["1h", 3_600_000],
    ["45s", 45_000],
  ])("parses %s as %i ms", (input, expected) => {
    expect(parseDurationMs(input)).toBe(expected);
  });

  it("throws on a malformed duration string", () => {
    expect(() => parseDurationMs("15 minutes")).toThrow();
    expect(() => parseDurationMs("")).toThrow();
    expect(() => parseDurationMs("15x")).toThrow();
  });
});
