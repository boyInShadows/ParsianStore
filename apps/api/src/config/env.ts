import { config as loadDotenv } from "dotenv";
import { fileURLToPath } from "node:url";
import { z } from "zod";

// `dotenv/config` resolves `.env` relative to `process.cwd()`, which is
// only apps/api when run via `pnpm --filter api ...` — a root-level `pnpm
// test`/`pnpm build` runs with the repo root as cwd instead and would
// silently miss this file. Resolving relative to this module's own path
// works regardless of which directory the process was launched from.
loadDotenv({ path: fileURLToPath(new URL("../../.env", import.meta.url)) });

// Only the variables the code written so far actually reads. Later P2
// steps (storage, search) add their own vars to this schema when the code
// that consumes them lands — see .env.example for the full declared
// surface (§11).
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGINS: z
    .string()
    .min(1, "CORS_ORIGINS must list at least one allowed origin")
    .default("http://localhost:3000")
    .transform((value) => value.split(",").map((origin) => origin.trim())),
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal", "silent"]).default("info"),
  MONGODB_URI: z.string().min(1).default("mongodb://localhost:27017/parsian-store"),

  // The PostgreSQL migration's destination. Optional on purpose *for now*:
  // both databases coexist while phase 2 moves the data layer module by
  // module, and a developer who has not created the Postgres role yet must
  // still be able to boot the API on Mongo. It becomes required in phase 3,
  // when Mongo comes out and this is the only database left.
  //
  // No default, unlike MONGODB_URI: this URL carries a password, and a
  // hardcoded fallback containing credentials is the thing the secret rule
  // exists to prevent.
  DATABASE_URL: z.string().min(1).optional(),

  // P2.S4 — auth. Secrets get NO default: a hardcoded fallback secret in
  // source is itself the vulnerability (CLAUDE.md's secret-management
  // rule), unlike CORS_ORIGINS/MONGODB_URI above which are non-secret
  // config with a legitimate local-dev default.
  JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET must be at least 32 characters"),
  JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET must be at least 32 characters"),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_TTL: z.string().default("30d"),
  SMS_PROVIDER: z.enum(["mock", "kavenegar"]).default("mock"),
  KAVENEGAR_API_KEY: z.string().optional(),
  OTP_TEMPLATE: z.string().optional(),

  // P2.S5 — staff seeding. Optional: a deploy that never runs the seed
  // script (or a test run) has no need for it.
  ADMIN_SEED_PHONE: z.string().optional(),

  // P2.S8 — storage. Only "local" is implemented (§4 manifest: an
  // S3-compatible driver is a later phase's job); PUBLIC_URL builds the
  // URLs LocalDiskStorageProvider hands back for files served from
  // apps/api's own /uploads static route.
  STORAGE_DRIVER: z.enum(["local"]).default("local"),
  PUBLIC_URL: z.string().url().default("http://localhost:4000"),

  // P3.S4 — search. Only "mongo" is implemented (§4 manifest anticipates
  // a Meilisearch driver via MEILI_HOST/MEILI_KEY later, same enum-of-one
  // pattern as STORAGE_DRIVER above until that second driver actually exists).
  SEARCH_DRIVER: z.enum(["mongo"]).default("mongo"),

  // P6.S3 — payment. ZARINPAL_MERCHANT_ID stays optional here (same
  // "required-if-selected" split as KAVENEGAR_API_KEY above) -- enforced
  // in providers/payment/index.ts's factory instead, not here.
  PAYMENT_PROVIDER: z.enum(["mock", "zarinpal"]).default("mock"),
  ZARINPAL_MERCHANT_ID: z.string().optional(),
  // z.coerce.boolean() is a real footgun for an env var: Boolean("false")
  // is true in JS, so it would silently treat ZARINPAL_SANDBOX=false as
  // true. An explicit string-literal parse avoids that.
  ZARINPAL_SANDBOX: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),

  // P9.S10 — lets the Playwright run opt out of the 100/min/IP API cap.
  // The e2e suite drives ~25 full landing renders through one IP in under a
  // minute, and every render fans out to several endpoints, so the cap trips
  // on volume alone. A throttled response then reaches a Server Component's
  // safe fetcher, which degrades to an empty result, which renders as a
  // *missing section* -- so a rate-limited run looks exactly like a broken
  // page and tests fail for reasons unrelated to the code under test.
  // Same escape hatch NODE_ENV=test already gives the unit suite, made
  // explicit so it can be used without pretending to be a different
  // environment. Never set this in production.
  RATE_LIMIT_DISABLED: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    // Fail fast and loud: a misconfigured deploy should never start serving
    // traffic with silently-wrong defaults.
    console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid environment configuration");
  }
  return parsed.data;
}

export const env = loadEnv();
