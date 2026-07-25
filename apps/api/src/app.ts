import express, { type Request, type Response } from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import cookieParser from "cookie-parser";
import { pinoHttp } from "pino-http";
import { healthResponseSchema } from "schemas";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { notFoundHandler } from "./middleware/notFound.js";
import { errorHandler } from "./middleware/error.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { vehiclesRouter } from "./modules/vehicles/vehicles.routes.js";

export function healthHandler(_req: Request, res: Response): void {
  const payload = healthResponseSchema.parse({
    ok: true,
    data: { status: "up" },
  });
  res.json(payload);
}

export const app = express();

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGINS, credentials: true }));
app.use(compression());
app.use(cookieParser());
app.use(express.json());
app.use(pinoHttp({ logger }));

app.get("/api/v1/health", healthHandler);
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/vehicles", vehiclesRouter);

// Must be registered after every route: unmatched requests fall through
// to notFoundHandler, thrown/passed errors fall through to errorHandler.
app.use(notFoundHandler);
app.use(errorHandler);
