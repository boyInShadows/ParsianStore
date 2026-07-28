import { createHash } from "node:crypto";

/** Deterministic hash for opaque tokens that must be looked up by value
 * (refresh tokens) — see RefreshToken.ts for why this isn't argon2. */
export function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

type DurationUnit = "s" | "m" | "h" | "d";

const DURATION_UNIT_MS: Record<DurationUnit, number> = {
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

/** Parses the simple duration strings this project actually uses for TTLs
 * (e.g. "15m", "30d") — env vars like JWT_ACCESS_TTL/JWT_REFRESH_TTL. */
export function parseDurationMs(input: string): number {
  const match = /^(\d+)(s|m|h|d)$/.exec(input);
  if (!match) {
    throw new Error(`Invalid duration string: "${input}" (expected e.g. "15m", "30d")`);
  }
  const [, amount, unit] = match as unknown as [string, string, DurationUnit];
  return Number(amount) * DURATION_UNIT_MS[unit];
}
