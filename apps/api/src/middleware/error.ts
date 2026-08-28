import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { ApiError } from "../utils/ApiError.js";
import { logger } from "../config/logger.js";

// A real, pre-existing gap found building P8.S2's admin product CRUD
// (not specific to that module): every admin create endpoint with a
// unique index -- categories.slug, brands.slug, attributes.key,
// products.slug/sku/authenticity.verificationCode -- fell through this
// handler's generic 500 on a duplicate, with no clean 400 anywhere.
// Fixed once, here, so every existing and future admin CRUD route
// benefits, not just the one that happened to surface it.
/**
 * Prisma reports a unique-constraint violation as a known request error with
 * code `P2002`, and names the offending column(s) in `meta.target`. That is
 * the same fact Mongo's `E11000` carried in `keyValue`, so the branch below is
 * unchanged apart from where it reads the field name from.
 *
 * Matched structurally rather than with `instanceof
 * Prisma.PrismaClientKnownRequestError`: the client is wrapped in an extension,
 * and an error crossing that boundary is not guaranteed to keep its prototype.
 */
interface UniqueConstraintError {
  code: "P2002";
  meta?: { target?: string[] | string };
}

function isDuplicateKeyError(err: unknown): err is UniqueConstraintError {
  return typeof err === "object" && err !== null && "code" in err && err.code === "P2002";
}

function duplicateField(err: UniqueConstraintError): string | undefined {
  const target = err.meta?.target;
  if (Array.isArray(target)) return target[0];
  return typeof target === "string" ? target : undefined;
}

// Express only recognizes an error-handling middleware by its 4-argument
// arity, so `next` must stay declared even though it's unused.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  // Every branch below returns a *handled* response, so pino-http records
  // only the status code -- without these lines a 400/404/409 is a bare
  // number in the terminal with no way to tell why it happened. Bodies are
  // unchanged; this only adds the reason to the log.
  if (err instanceof ApiError) {
    const level = err.statusCode >= 500 ? "error" : "warn";
    logger[level](
      { statusCode: err.statusCode, path: req.originalUrl },
      `ApiError: ${err.message}`,
    );
    res.status(err.statusCode).json({ ok: false, error: { message: err.message } });
    return;
  }

  if (err instanceof ZodError) {
    logger.warn({ path: req.originalUrl, issues: err.issues }, "Invalid request");
    res.status(400).json({ ok: false, error: { message: "Invalid request", issues: err.issues } });
    return;
  }

  if (isDuplicateKeyError(err)) {
    const field = duplicateField(err);
    logger.warn({ path: req.originalUrl, field }, "Duplicate key");
    res.status(400).json({
      ok: false,
      error: {
        message: field
          ? `این مقدار برای «${field}» قبلاً استفاده شده است`
          : "این مقدار قبلاً استفاده شده است",
      },
    });
    return;
  }

  logger.error({ err, path: req.originalUrl }, "Unhandled error");
  res.status(500).json({ ok: false, error: { message: "Internal server error" } });
};
