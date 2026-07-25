import type { RequestHandler } from "express";
import type { ZodSchema } from "zod";

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
