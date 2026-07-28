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
