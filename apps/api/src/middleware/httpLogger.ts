import type { Request, Response } from "express";
import { pinoHttp } from "pino-http";
import { logger } from "../config/logger.js";

// Paths whose access log is pure noise: the health endpoint is polled by
// tooling on a timer, and /uploads/* is static asset traffic that would
// bury real request lines in a dev terminal. They still go through the
// same middleware -- only their access log line is suppressed.
const SILENT_PATH_PREFIXES = ["/api/v1/health", "/uploads/"] as const;

function isSilentPath(url: string): boolean {
  // Compare against the path only -- a query string must not defeat the match.
  const queryStart = url.indexOf("?");
  const path = queryStart === -1 ? url : url.slice(0, queryStart);
  return SILENT_PATH_PREFIXES.some((prefix) => path.startsWith(prefix));
}

// originalUrl, not url: Express rewrites `req.url` relative to the mount
// point as a request descends into routers, so by the time the response
// finishes it reads "/" for anything served by a nested router --
// `GET /?limit=1` instead of `GET /api/v1/catalog/products?limit=1`.
// originalUrl is never mutated.
function summarize(req: Request, res: Response, suffix: string): string {
  return `${req.method} ${req.originalUrl} ${res.statusCode} ${suffix}`;
}

/**
 * Per-request access log. pino-http's default emits the whole req/res
 * object per request, which is unreadable in a dev terminal; these
 * `custom*Message` hooks collapse it to one line -- `GET /api/v1/x 200 12ms`.
 * The structured req/res data is still on the log record for production
 * JSON output; it is only hidden from the pretty dev renderer, in
 * config/logger.ts's `ignore` list.
 */
export const httpLogger = pinoHttp<Request, Response>({
  logger,
  autoLogging: { ignore: (req) => isSilentPath(req.originalUrl) },
  // A 4xx is the client's fault and a 5xx is ours -- levelling them apart
  // means `LOG_LEVEL=warn` shows exactly the failing requests and nothing else.
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
  customSuccessMessage: (req, res, responseTime) =>
    summarize(req, res, `${Math.round(responseTime)}ms`),
  // Only fires when the connection itself fails (socket error, aborted
  // request) -- a 4xx/5xx JSON response is a *successful* exchange as far
  // as pino-http is concerned and goes through customSuccessMessage above.
  customErrorMessage: (req, res, err) => summarize(req, res, err.message),
});
