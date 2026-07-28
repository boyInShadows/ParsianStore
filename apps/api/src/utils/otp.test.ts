import { describe, expect, it } from "vitest";
import { generateOtpCode } from "./otp.js";

describe("generateOtpCode", () => {
  it("always returns a 6-digit zero-padded string", () => {
    for (let i = 0; i < 200; i++) {
      const code = generateOtpCode();
      expect(code).toMatch(/^\d{6}$/);
    }
  });

  it("produces varied codes rather than a constant value", () => {
    const codes = new Set(Array.from({ length: 50 }, () => generateOtpCode()));
    expect(codes.size).toBeGreaterThan(1);
  });
});
