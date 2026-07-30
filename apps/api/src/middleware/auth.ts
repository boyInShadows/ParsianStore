import type { RequestHandler } from "express";
import { verifyAccessToken, type AccessTokenPayload } from "../utils/jwt.js";
import { ApiError } from "../utils/ApiError.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
    }
  }
}

/** Verifies the access-token cookie and populates req.user. Role checks
 * belong to the separate rbac middleware (P2.S5) — this only answers
 * "is there a valid session," never "is this session allowed to do X." */
export const requireAuth: RequestHandler = (req, _res, next) => {
  const token = req.cookies?.accessToken as string | undefined;
  if (!token) {
    next(new ApiError(401, "ورود الزامی است"));
    return;
  }
  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    next(new ApiError(401, "نشست نامعتبر است، دوباره وارد شوید"));
  }
};

/** Cart (P5.S8) is the first route set that must work for a real guest —
 * populates req.user when a valid accessToken cookie is present, but never
 * throws when it's absent or invalid (an expired/garbage cookie just means
 * "treat as guest," not "reject the request" — unlike requireAuth). */
export const optionalAuth: RequestHandler = (req, _res, next) => {
  const token = req.cookies?.accessToken as string | undefined;
  if (!token) {
    next();
    return;
  }
  try {
    req.user = verifyAccessToken(token);
  } catch {
    // Invalid/expired token on an optional-auth route: proceed as guest
    // rather than rejecting — the caller isn't required to be signed in.
  }
  next();
};
