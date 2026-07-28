import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { ApiError } from "../utils/ApiError.js";
import { logger } from "../config/logger.js";

// Express only recognizes an error-handling middleware by its 4-argument
// arity, so `next` must stay declared even though it's unused.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({ ok: false, error: { message: err.message } });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({ ok: false, error: { message: "Invalid request", issues: err.issues } });
    return;
  }

  logger.error({ err, path: req.originalUrl }, "Unhandled error");
  res.status(500).json({ ok: false, error: { message: "Internal server error" } });
};
