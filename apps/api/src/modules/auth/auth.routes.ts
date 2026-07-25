import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import * as authController from "./auth.controller.js";
import { otpRequestSchema, otpVerifySchema } from "./auth.schema.js";

export const authRouter = Router();

authRouter.post("/otp/request", validate(otpRequestSchema), authController.requestOtpHandler);
authRouter.post("/otp/verify", validate(otpVerifySchema), authController.verifyOtpHandler);
authRouter.post("/refresh", authController.refreshHandler);
authRouter.post("/logout", authController.logoutHandler);
authRouter.get("/me", requireAuth, authController.meHandler);
