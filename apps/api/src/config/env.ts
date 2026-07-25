import "dotenv/config";
import { z } from "zod";

// Only the variables this phase's code actually reads. Later P2 steps
// (Mongo, JWT/SMS auth, storage, search) add their own vars to this schema
// when the code that consumes them lands — see .env.example for the full
// declared surface (§11).
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
