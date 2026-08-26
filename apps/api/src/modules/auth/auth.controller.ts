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

/**
 * "Who am I?" -- and "nobody" is a real answer, not an error.
 *
 * This used to sit behind `requireAuth` and 401 for a signed-out visitor. The
 * web client asks on every page load and cannot avoid it: the session lives in
 * httpOnly cookies, so JavaScript has no way to check whether one exists before
 * asking. Every anonymous visit therefore wrote a failed request to the browser
 * console -- correct behaviour producing a permanent error, and half of the
 * landing page's Lighthouse best-practices deduction (fableTasks §7 item 12).
 *
 * Now it runs under `optionalAuth` and answers `{ ok: true, data: null }`. The
 * envelope is unchanged, and both fetchers already treat a missing user as
 * "signed out", so nothing downstream had to move. PATCH /me keeps
 * `requireAuth` -- reading who you are is public, changing it is not.
 */
export async function meHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      res.json({ ok: true, data: null });
      return;
    }
    const user = await authService.getUserById(req.user.sub);
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
