import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../config/env.js";
import type { AccountType, UserRole } from "@prisma/client";

export interface AccessTokenPayload {
  sub: string;
  role: UserRole;
  // P6.S1: embedded at issue time, same staleness tradeoff `role` already
  // has -- an accountType change doesn't take effect until the token
  // refreshes. Avoids a DB lookup on every price-serving request.
  accountType: AccountType;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    // @types/jsonwebtoken narrows `expiresIn` to the `ms` package's
    // template-literal type; env.JWT_ACCESS_TTL is a plain (Zod-validated)
    // string, so this is a legitimate narrowing cast, not an unsafe one.
    expiresIn: env.JWT_ACCESS_TTL as SignOptions["expiresIn"],
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}
