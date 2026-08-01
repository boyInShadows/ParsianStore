import pino from "pino";
import { env } from "./env.js";

// Hidden from the *pretty dev renderer only* -- the keys stay on the log
// record, so production JSON still carries the full structured req/res for
// aggregation. pino-http attaches a whole req/res object to every access
// log; printed verbatim that buries the one-line summary built in
// middleware/httpLogger.ts. `pid,hostname` are pino-pretty's own defaults,
// repeated here because setting `ignore` replaces them rather than adding.
const DEV_HIDDEN_LOG_KEYS = "pid,hostname,req,res,responseTime";

export const logger = pino({
  level: env.LOG_LEVEL,
  transport:
    env.NODE_ENV === "development"
      ? {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "SYS:HH:MM:ss", ignore: DEV_HIDDEN_LOG_KEYS },
        }
      : undefined,
});
