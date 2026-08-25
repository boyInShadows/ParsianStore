import { Router } from "express";
import { optionalAuth, requireAuth } from "../../middleware/auth.js";
import { authRateLimiter, otpRequestRateLimiter } from "../../middleware/rateLimit.js";
import { validate } from "../../middleware/validate.js";
import * as authController from "./auth.controller.js";
import { otpRequestSchema, otpVerifySchema, profileUpdateSchema } from "./auth.schema.js";

export const authRouter = Router();

/**
 * §10: "auth 10/15min/IP", applied per credential-handling endpoint on top
 * of the otp/request-specific per-phone limit below.
 *
 * P8.S6 stopped applying it as `authRouter.use(...)` across the whole
 * surface. That also covered `GET /me`, which is a session READ with
 * nothing to brute-force -- and the (admin) layout calls it server-side on
 * EVERY admin page render. Eleven admin page views inside fifteen minutes
 * therefore 429'd, `fetchMeServer` read that as "not signed in", and a
 * perfectly authenticated staff member was redirected to the login screen.
 * Behind one office IP, a few staff would lock each other out in under a
 * minute. Found by hitting it while verifying this step's own screens.
 *
 * `/me` is still rate limited -- by the general 100/min/IP `apiRateLimiter`
 * mounted on all of /api/v1 in app.ts.
 */
authRouter.post(
  "/otp/request",
  authRateLimiter,
  validate(otpRequestSchema),
  otpRequestRateLimiter,
  authController.requestOtpHandler,
);
authRouter.post(
  "/otp/verify",
  authRateLimiter,
  validate(otpVerifySchema),
  authController.verifyOtpHandler,
);
authRouter.post("/refresh", authRateLimiter, authController.refreshHandler);
authRouter.post("/logout", authController.logoutHandler);
// `optionalAuth`, not `requireAuth`: a signed-out visitor gets 200 with a null
// user rather than a 401 the browser logs on every anonymous page load. See
// meHandler for why the client cannot simply skip the call.
authRouter.get("/me", optionalAuth, authController.meHandler);
authRouter.patch(
  "/me",
  requireAuth,
  validate(profileUpdateSchema),
  authController.updateProfileHandler,
);
