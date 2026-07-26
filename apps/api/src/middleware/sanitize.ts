import type { RequestHandler } from "express";
import { sanitize } from "express-mongo-sanitize";

/**
 * Strips Mongo operator keys (`$where`, `$gt`, ...) and dotted paths out of
 * `req.body`/`req.params` (§10: "express-mongo-sanitize"). Uses the
 * package's `sanitize()` function directly rather than its default
 * middleware export: that middleware does `req[key] = target` for
 * `req.query` too, and Express 5 makes `req.query` a read-only getter that
 * re-parses the URL on every access (see middleware/validate.ts) — there is
 * no object to reassign, and the reassignment itself throws.
 *
 * Leaving `req.query` unsanitized here is an acceptable gap, not an
 * oversight: every route's query is Zod-validated (§9), and no schema in
 * this codebase accepts an object/record for a query field, so a
 * bracket-notation operator injection (`?field[$gt]=x`, which qs parses
 * into `{ $gt: 'x' }`) fails Zod's string/number/enum parse in
 * `validateQuery()` before it could ever reach a Mongo filter.
 */
export const sanitizeRequest: RequestHandler = (req, _res, next) => {
  if (req.body && typeof req.body === "object") {
    sanitize(req.body);
  }
  if (req.params && typeof req.params === "object") {
    sanitize(req.params);
  }
  next();
};
