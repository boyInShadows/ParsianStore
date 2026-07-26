import type { RequestHandler } from "express";
import type { ZodSchema } from "zod";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      // Express 5 makes req.query a read-only getter, so a parsed/coerced
      // query (numbers instead of strings, defaults applied) can't be
      // written back onto it the way validate() does for req.body —
      // it lives here instead.
      validatedQuery?: unknown;
    }
  }
}

/**
 * Every route's Zod-validated body/query/params gate (§9: "Every route:
 * Zod-validated body/query/params via validate() middleware. Unvalidated
 * route = rejected step."). Replaces req.body with the parsed (and
 * type-coerced/transformed) result so downstream controllers get a typed,
 * trustworthy value instead of raw `any`. ZodErrors flow to the global
 * error middleware, which already maps them to a 400 (middleware/error.ts).
 */
export function validate(schema: ZodSchema): RequestHandler {
  return (req, _res, next) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      next(err);
    }
  };
}

/** Same contract as validate(), for query strings — see req.validatedQuery. */
export function validateQuery(schema: ZodSchema): RequestHandler {
  return (req, _res, next) => {
    try {
      req.validatedQuery = schema.parse(req.query);
      next();
    } catch (err) {
      next(err);
    }
  };
}

/** Same contract as validate(), for route params (:id, :slug, ...). Unlike
 * req.query, req.params is a plain property the router assigns per-request
 * (not a getter), so it can be reassigned directly like req.body. */
export function validateParams(schema: ZodSchema): RequestHandler {
  return (req, _res, next) => {
    try {
      req.params = schema.parse(req.params);
      next();
    } catch (err) {
      next(err);
    }
  };
}
