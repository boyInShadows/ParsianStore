import { describe, expect, it } from "vitest";
import { z } from "zod";

// Re-declared here rather than importing `env.ts` directly: that module
// parses `process.env` and throws at import time, which would make every
// test in this file depend on the real process environment. Testing the
// schema shape in isolation is both simpler and closer to a true unit test.
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGINS: z
    .string()
    .min(1, "CORS_ORIGINS must list at least one allowed origin")
    .default("http://localhost:3000")
    .transform((value) => value.split(",").map((origin) => origin.trim())),
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal", "silent"]).default("info"),
});

describe("envSchema", () => {
  it("applies defaults when optional vars are absent", () => {
    const result = envSchema.parse({ CORS_ORIGINS: "http://localhost:3000" });
    expect(result.NODE_ENV).toBe("development");
    expect(result.PORT).toBe(4000);
    expect(result.LOG_LEVEL).toBe("info");
  });

  it("splits and trims a comma-separated CORS_ORIGINS list", () => {
    const result = envSchema.parse({
      CORS_ORIGINS: "http://localhost:3000, https://parsianstore.ir",
    });
    expect(result.CORS_ORIGINS).toEqual(["http://localhost:3000", "https://parsianstore.ir"]);
  });

  it("falls back to the local web app's origin when CORS_ORIGINS is absent", () => {
    const result = envSchema.parse({});
    expect(result.CORS_ORIGINS).toEqual(["http://localhost:3000"]);
  });

  it("rejects an explicitly empty CORS_ORIGINS", () => {
    expect(() => envSchema.parse({ CORS_ORIGINS: "" })).toThrow();
  });

  it("rejects a non-numeric PORT", () => {
    expect(() =>
      envSchema.parse({ CORS_ORIGINS: "http://localhost:3000", PORT: "not-a-port" }),
    ).toThrow();
  });

  it("coerces a numeric-string PORT from the environment", () => {
    const result = envSchema.parse({ CORS_ORIGINS: "http://localhost:3000", PORT: "5000" });
    expect(result.PORT).toBe(5000);
  });
});
