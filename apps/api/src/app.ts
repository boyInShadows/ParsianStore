import express, { type Request, type Response } from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import cookieParser from "cookie-parser";
import { healthResponseSchema } from "schemas";
import { env } from "./config/env.js";
import { httpLogger } from "./middleware/httpLogger.js";
import { notFoundHandler } from "./middleware/notFound.js";
import { errorHandler } from "./middleware/error.js";
import { apiRateLimiter } from "./middleware/rateLimit.js";
import { requestId } from "./middleware/requestId.js";
import { sanitizeRequest } from "./middleware/sanitize.js";
import { authenticityRouter } from "./modules/authenticity/authenticity.routes.js";
import { addressesRouter } from "./modules/addresses/addresses.routes.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { cartRouter } from "./modules/cart/cart.routes.js";
import { adminCatalogRouter } from "./modules/catalog/catalog.admin.routes.js";
import { catalogRouter } from "./modules/catalog/catalog.routes.js";
import { checkoutRouter } from "./modules/checkout/checkout.routes.js";
import { adminCouponsRouter } from "./modules/coupons/coupons.admin.routes.js";
import { adminCustomersRouter } from "./modules/users/users.admin.routes.js";
import { adminDashboardRouter } from "./modules/dashboard/dashboard.admin.routes.js";
import { adminAuditRouter } from "./modules/audit/audit.admin.routes.js";
import { adminShippingRouter } from "./modules/shipping/shipping.admin.routes.js";
import { adminVehiclesRouter } from "./modules/vehicles/vehicles.admin.routes.js";
import { adminFitmentRouter } from "./modules/fitment/fitment.admin.routes.js";
import { fitmentRouter } from "./modules/fitment/fitment.routes.js";
import { feedbackRouter } from "./modules/feedback/feedback.routes.js";
import { adminFeedbackRouter } from "./modules/feedback/feedback.admin.routes.js";
import { geoRouter } from "./modules/geo/geo.routes.js";
import { adminInventoryRouter } from "./modules/inventory/inventory.admin.routes.js";
import { adminOrdersRouter } from "./modules/orders/orders.admin.routes.js";
import { ordersRouter } from "./modules/orders/orders.routes.js";
import { paymentsRouter } from "./modules/payments/payments.routes.js";
import { adminPaymentsRouter } from "./modules/payments/payments.admin.routes.js";
import { vehiclesRouter } from "./modules/vehicles/vehicles.routes.js";
import { wishlistRouter } from "./modules/wishlist/wishlist.routes.js";
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
app.use(httpLogger);
app.use(sanitizeRequest);
app.use("/api/v1", apiRateLimiter);

app.get("/api/v1/health", healthHandler);
app.use("/api/v1/auth", authRouter);
// optionalAuth is applied inside cartRouter itself -- unlike every
// requireAuth-gated router, cart must work for a real guest per §9's own
// route shape (/cart, not /me/cart).
app.use("/api/v1/cart", cartRouter);
app.use("/api/v1/vehicles", vehiclesRouter);
app.use("/api/v1/geo", geoRouter);
app.use("/api/v1/catalog", catalogRouter);
app.use("/api/v1/admin/catalog", adminCatalogRouter);
app.use("/api/v1/authenticity", authenticityRouter);
app.use("/api/v1/fitment", fitmentRouter);
app.use("/api/v1/feedback", feedbackRouter);
app.use("/api/v1/admin/feedback", adminFeedbackRouter);
app.use("/api/v1/admin/inventory", adminInventoryRouter);
// requireAuth is applied inside wishlistRouter itself (matches how
// catalog.admin.routes.ts's entity routers apply their own middleware
// chain internally) -- no shared `/me` parent router yet, this is the
// first `/me/*` resource; app.ts's own style is flat per-resource mounts.
app.use("/api/v1/me/wishlist", wishlistRouter);
// requireAuth is applied inside addressesRouter itself, same style as
// wishlistRouter above -- P6.S2's address book, checkout's first real
// dependency (auth-only per the owner's own decision, no guest identity).
app.use("/api/v1/me/addresses", addressesRouter);
// P6.S5. requireAuth is applied inside checkoutRouter itself, same style
// as wishlistRouter/addressesRouter above.
app.use("/api/v1/checkout", checkoutRouter);
// P7.S1. requireAuth inside ordersRouter itself, same style as every
// other /me/* router above.
app.use("/api/v1/me/orders", ordersRouter);
// P8.S1. requireAuth+requireStaff() applied inside adminOrdersRouter
// itself, same style as adminCatalogRouter/adminInventoryRouter above.
app.use("/api/v1/admin/orders", adminOrdersRouter);
// P8.S3. Same requireStaff()+auditLog stack, applied inside each router.
// Coupons and customers each get their own top-level admin mount --
// neither is a catalog entity, matching how /admin/orders sits apart
// from /admin/catalog.
app.use("/api/v1/admin/coupons", adminCouponsRouter);
app.use("/api/v1/admin/customers", adminCustomersRouter);
// P8.S5. Read-only aggregate over orders/products/users -- its own mount
// rather than a leaf under any one of them, since it belongs to none.
app.use("/api/v1/admin/dashboard", adminDashboardRouter);
// P8.S8. Reads back what auditLog() has been writing since P8.S1.
// admin/superadmin only -- see audit.admin.routes.ts.
app.use("/api/v1/admin/audit", adminAuditRouter);
// P8.S9. The weight/price ladder behind /cart/estimate-shipping, which
// until now could only be changed by re-running the seed script.
app.use("/api/v1/admin/shipping", adminShippingRouter);
// P8.S6 §3.7. The vehicle tree and the fitment records that reference it
// -- both had public read endpoints since P2.S6 and no write path at all
// outside a seed script.
app.use("/api/v1/admin/vehicles", adminVehiclesRouter);
app.use("/api/v1/admin/fitment", adminFitmentRouter);
// No auth on paymentsRouter -- see payments.routes.ts, this is the
// gateway's own redirect target, not a client-called resource.
app.use("/api/v1/payments", paymentsRouter);
app.use("/api/v1/admin/payments", adminPaymentsRouter);
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
