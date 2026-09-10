import type { RequestHandler } from "express";
import { UserRole } from "@prisma/client";
import { ApiError } from "../utils/ApiError.js";

/** Role checks live here, never inline in a handler (§3.3.6). Must run
 * after requireAuth — reads req.user, doesn't verify it. */
export function requireRole(...allowedRoles: UserRole[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) {
      next(new ApiError(401, "ورود الزامی است"));
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      next(new ApiError(403, "شما اجازه دسترسی به این بخش را ندارید"));
      return;
    }
    next();
  };
}

/** Every role the schema declares, minus the one that is not staff. Read from
 * Prisma's generated enum rather than a hand-kept array, so a role added to
 * `schema.prisma` is staff here without anyone remembering this file. */
export const STAFF_ROLES: readonly UserRole[] = Object.values(UserRole).filter(
  (role) => role !== UserRole.customer,
);

/** Shorthand for "any staff role" — everything under /admin. */
export function requireStaff(): RequestHandler {
  return requireRole(...STAFF_ROLES);
}
