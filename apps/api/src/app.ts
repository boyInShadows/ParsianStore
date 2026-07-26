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
import { apiRateLimiter } from "./middleware/rateLimit.js";
import { requestId } from "./middleware/requestId.js";
import { sanitizeRequest } from "./middleware/sanitize.js";
import { authenticityRouter } from "./modules/authenticity/authenticity.routes.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { adminCatalogRouter } from "./modules/catalog/catalog.admin.routes.js";
import { catalogRouter } from "./modules/catalog/catalog.routes.js";
import { fitmentRouter } from "./modules/fitment/fitment.routes.js";
import { geoRouter } from "./modules/geo/geo.routes.js";
import { adminInventoryRouter } from "./modules/inventory/inventory.admin.routes.js";
import { vehiclesRouter } from "./modules/vehicles/vehicles.routes.js";
import { uploadsDir } from "./providers/storage/index.js";

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
app.use(requestId);
app.use(pinoHttp({ logger }));
app.use(sanitizeRequest);
app.use("/api/v1", apiRateLimiter);

app.get("/api/v1/health", healthHandler);
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/vehicles", vehiclesRouter);
app.use("/api/v1/geo", geoRouter);
app.use("/api/v1/catalog", catalogRouter);
app.use("/api/v1/admin/catalog", adminCatalogRouter);
app.use("/api/v1/authenticity", authenticityRouter);
app.use("/api/v1/fitment", fitmentRouter);
app.use("/api/v1/admin/inventory", adminInventoryRouter);
// LocalDiskStorageProvider's saved variants (P2.S8) — served directly, no
// auth: product/category imagery is public by nature. P2.S9 security
// header audit: helmet()'s default Cross-Origin-Resource-Policy is
// same-origin, which would make browsers block <img> loads from apps/web
// (a different origin in both dev and prod) — overridden to cross-origin
// for this route only. The JSON API routes above keep helmet's stricter
// default; only intentionally-public static assets need this.
app.use(
  "/uploads",
  (_req, res, next) => {
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    next();
  },
  express.static(uploadsDir),
);

// Must be registered after every route: unmatched requests fall through
// to notFoundHandler, thrown/passed errors fall through to errorHandler.
app.use(notFoundHandler);
app.use(errorHandler);
