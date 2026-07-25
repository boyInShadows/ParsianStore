import { randomInt } from "node:crypto";

/** A cryptographically random 6-digit code, zero-padded (§3.3). */
export function generateOtpCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}
