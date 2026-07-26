import type { RequestHandler } from "express";
import { nanoid } from "nanoid";

/**
 * Assigns a per-request id and echoes it back as `X-Request-Id` (§9/§10
 * observability). Must run before `pinoHttp()` in app.ts: pino-http's
 * default id generator reuses `req.id` if already set
 * (`req.id = req.id || genReqId(req, res)`), so setting it here makes
 * every log line for this request carry the same id the client can see.
 */
export const requestId: RequestHandler = (req, res, next) => {
  const id = nanoid();
  req.id = id;
  res.setHeader("X-Request-Id", id);
  next();
};
