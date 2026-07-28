import { Schema, model, type Types } from "mongoose";
import type { WithTimestamps } from "./plugins.js";
import { timestampsPlugin } from "./plugins.js";

export interface RefreshToken extends WithTimestamps {
  userId: Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  userAgent?: string;
  revokedAt: Date | null;
}

const refreshTokenSchema = new Schema<RefreshToken>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  // Deterministic hash (not argon2): the raw token presented by a client
  // must be looked UP by its hash (`findOne({ tokenHash })`), which a
  // salted/slow hash can't support. Safe here because the token itself is
  // a long random value (nanoid), not a low-entropy secret like a
  // password or a 6-digit OTP — see auth.service.ts.
  tokenHash: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  userAgent: { type: String },
  revokedAt: { type: Date, default: null },
});

// Same reasoning as OtpToken: never client-facing, nothing to soft-delete
// or restore — a revoked/expired refresh token is simply dead.
timestampsPlugin(refreshTokenSchema);

export const RefreshTokenModel = model<RefreshToken>("RefreshToken", refreshTokenSchema);
