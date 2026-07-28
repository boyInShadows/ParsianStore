import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { authRateLimiter, otpRequestRateLimiter } from "../../middleware/rateLimit.js";
import { validate } from "../../middleware/validate.js";
import * as authController from "./auth.controller.js";
import { otpRequestSchema, otpVerifySchema } from "./auth.schema.js";

export const authRouter = Router();

// §10: "auth 10/15min/IP" applies to the whole surface, on top of the
// otp/request-specific per-phone limit below.
authRouter.use(authRateLimiter);

authRouter.post(
  "/otp/request",
  validate(otpRequestSchema),
  otpRequestRateLimiter,
  authController.requestOtpHandler,
);
authRouter.post("/otp/verify", validate(otpVerifySchema), authController.verifyOtpHandler);
authRouter.post("/refresh", authController.refreshHandler);
authRouter.post("/logout", authController.logoutHandler);
authRouter.get("/me", requireAuth, authController.meHandler);
