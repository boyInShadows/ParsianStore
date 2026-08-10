import type { NextFunction, Request, Response } from "express";
import { env } from "../../config/env.js";
import { ApiError } from "../../utils/ApiError.js";
import { parseDurationMs } from "../../utils/token.js";
import * as authService from "./auth.service.js";
import type { OtpRequestInput, OtpVerifyInput, ProfileUpdateInput } from "./auth.schema.js";
import type { AuthSession } from "./auth.service.js";

const COOKIE_BASE = {
  httpOnly: true,
  sameSite: "lax" as const,
  // Secure cookies require HTTPS — off in local dev (plain http://localhost).
  secure: env.NODE_ENV === "production",
};

function setSessionCookies(res: Response, session: AuthSession): void {
  res.cookie("accessToken", session.accessToken, {
    ...COOKIE_BASE,
    maxAge: parseDurationMs(env.JWT_ACCESS_TTL),
  });
  res.cookie("refreshToken", session.refreshToken, {
    ...COOKIE_BASE,
    maxAge: parseDurationMs(env.JWT_REFRESH_TTL),
  });
}

function clearSessionCookies(res: Response): void {
  res.clearCookie("accessToken");
  res.clearCookie("refreshToken");
}

export async function requestOtpHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { phone } = req.body as OtpRequestInput;
    await authService.requestOtp(phone);
    res.json({ ok: true, data: { message: "کد تایید ارسال شد" } });
  } catch (err) {
    next(err);
  }
}

export async function verifyOtpHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { phone, code } = req.body as OtpVerifyInput;
    const session = await authService.verifyOtp(phone, code, req.get("user-agent"));
    setSessionCookies(res, session);
    res.json({ ok: true, data: session.user });
  } catch (err) {
    next(err);
  }
}

export async function refreshHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const rawRefreshToken = req.cookies?.refreshToken as string | undefined;
    if (!rawRefreshToken) {
      throw new ApiError(401, "نشست یافت نشد");
    }
    const session = await authService.refreshSession(rawRefreshToken, req.get("user-agent"));
    setSessionCookies(res, session);
    res.json({ ok: true, data: session.user });
  } catch (err) {
    next(err);
  }
}

export async function logoutHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const rawRefreshToken = req.cookies?.refreshToken as string | undefined;
    if (rawRefreshToken) {
      await authService.logout(rawRefreshToken);
    }
    clearSessionCookies(res);
    res.json({ ok: true, data: null });
  } catch (err) {
    next(err);
  }
}

export async function meHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await authService.getUserById(req.user!.sub);
    res.json({ ok: true, data: user });
  } catch (err) {
    next(err);
  }
}

export async function updateProfileHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = await authService.updateProfile(req.user!.sub, req.body as ProfileUpdateInput);
    res.json({ ok: true, data: user });
  } catch (err) {
    next(err);
  }
}
