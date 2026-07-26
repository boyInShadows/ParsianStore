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
