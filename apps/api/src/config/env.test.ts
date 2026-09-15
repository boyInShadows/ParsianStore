import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
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
    .default("http://localhost:3000,http://localhost:3200")
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

  it("falls back to both local web origins when CORS_ORIGINS is absent", () => {
    const result = envSchema.parse({});
    // `:3000` is `next dev`; `:3200` is the port every local harness serves the
    // production build on (Lighthouse recipe, shots/axe scripts, E2E_PORT).
    // Without the second one the garage vehicle selector's client-side fetch
    // fails CORS on the harness port and all three selects stay disabled.
    expect(result.CORS_ORIGINS).toEqual(["http://localhost:3000", "http://localhost:3200"]);
  });

  it("keeps :3000 first, because checkout builds its redirect from CORS_ORIGINS[0]", () => {
    // checkout.service.ts's buildPaymentResultUrl reuses the first entry as
    // "the web app's own primary origin". Appending to this list is safe;
    // prepending silently re-points every post-payment redirect.
    expect(envSchema.parse({}).CORS_ORIGINS[0]).toBe("http://localhost:3000");
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

/**
 * The schema above is a *copy*. That keeps the unit tests off `process.env`
 * (see the note at the top), but it also means every assertion in this file
 * can stay green while `env.ts` says something else entirely -- a test that
 * cannot fail for the thing it appears to be testing.
 *
 * So the one default whose value has behavioural consequences is pinned
 * against the real source text as well. Source-level rather than by import,
 * because importing `env.ts` parses `process.env` and throws.
 */
describe("env.ts source", () => {
  const source = readFileSync(fileURLToPath(new URL("./env.ts", import.meta.url)), "utf8");

  it("declares the same CORS_ORIGINS default this file asserts on", () => {
    expect(source).toContain('.default("http://localhost:3000,http://localhost:3200")');
  });
});
