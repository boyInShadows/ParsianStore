import rateLimit, { HOUR, MINUTE, type Options } from "express-rate-limit";
import { normalizePhone } from "schemas";
import { env } from "../config/env.js";

// §10: "rate limits (OTP 5/hr/phone, auth 10/15min/IP, API 100/min/IP)".
// Skipped entirely in tests — express-rate-limit's in-memory store is
// keyed per limiter instance, and every test file in this repo imports
// the same `app` singleton (see app.test.ts, auth.routes.test.ts, ...),
// so without this a full `pnpm test` run would trip these limits on
// request volume alone, unrelated to any actual abuse.
const sharedOptions: Partial<Options> = {
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => env.NODE_ENV === "test" || env.RATE_LIMIT_DISABLED,
  handler: (_req, res) => {
    res.status(429).json({ ok: false, error: { message: "تعداد درخواست‌ها بیش از حد مجاز است" } });
  },
};

export const apiRateLimiter = rateLimit({
  ...sharedOptions,
  windowMs: MINUTE,
  limit: 100,
});

export const authRateLimiter = rateLimit({
  ...sharedOptions,
  windowMs: 15 * MINUTE,
  limit: 10,
});

export const otpRequestRateLimiter = rateLimit({
  ...sharedOptions,
  windowMs: HOUR,
  limit: 5,
  // Keyed by phone, not IP: the thing worth capping is "how many codes can
  // be requested for this number," regardless of which IP asks. Runs after
  // validate(otpRequestSchema) (see auth.routes.ts), so req.body.phone has
  // already passed the E.164-ish shape check.
  keyGenerator: (req) => normalizePhone((req.body as { phone: string }).phone),
});
