import { Schema, model } from "mongoose";
import type { WithTimestamps } from "./plugins.js";
import { timestampsPlugin } from "./plugins.js";

// Only "login" exists today — §3.3's entire auth flow is unified
// request/verify with auto-create-on-first-login, so there's no separate
// registration or password-reset purpose yet. The field is real (not
// speculative) because §3.2 names it explicitly as part of the locked
// OtpToken shape; widen this union when a second purpose actually ships.
export type OtpPurpose = "login";

export interface OtpToken extends WithTimestamps {
  phone: string;
  codeHash: string;
  expiresAt: Date;
  attempts: number;
  purpose: OtpPurpose;
}

const otpTokenSchema = new Schema<OtpToken>({
  phone: { type: String, required: true, index: true },
  codeHash: { type: String, required: true },
  // TTL index: Mongo drops the document itself once expiresAt passes
  // (docs/db-indexes.md's TTL convention) — no cron sweep needed for OTP
  // cleanup.
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  attempts: { type: Number, default: 0 },
  purpose: { type: String, enum: ["login"], default: "login", required: true },
});

// No soft-delete/toJSON here deliberately: an OTP record is never shown
// to a client (it's consumed server-side only) and is never "restored"
// after use — applyBasePlugins' extra behavior would be dead weight.
timestampsPlugin(otpTokenSchema);

export const OtpTokenModel = model<OtpToken>("OtpToken", otpTokenSchema);
