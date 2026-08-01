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
interface MongoDuplicateKeyError {
  code: 11000;
  keyValue?: Record<string, unknown>;
}

function isDuplicateKeyError(err: unknown): err is MongoDuplicateKeyError {
  return typeof err === "object" && err !== null && "code" in err && err.code === 11000;
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
    const field = err.keyValue ? Object.keys(err.keyValue)[0] : undefined;
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
