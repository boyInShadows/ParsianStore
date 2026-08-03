import { z } from "zod";

// P8.S5: the shape behind /admin's KPI overview. Own file, same
// bundle-budget reasoning as admin-coupon.ts/admin-customer.ts -- the
// shop bundle must never pull an admin-only schema in.

export const DASHBOARD_RANGES = ["7d", "30d", "90d"] as const;
export const dashboardRangeSchema = z.enum(DASHBOARD_RANGES);
export type DashboardRangeDto = z.infer<typeof dashboardRangeSchema>;

/**
 * Which order statuses count as money actually earned. `pending` is an
 * order that never got paid, `cancelled`/`refunded` are money that left
 * again -- counting any of them would make the revenue tile a vanity
 * number rather than something staff can act on.
 */
export const REVENUE_ORDER_STATUSES = ["paid", "processing", "shipped", "delivered"] as const;

const dashboardTotalsSchema = z.object({
  revenueRial: z.number(),
  orderCount: z.number(),
  // Integer Rial, floored -- money is never a float (CLAUDE.md rule 8).
  averageOrderRial: z.number(),
  newCustomers: z.number(),
});
export type AdminDashboardTotalsDto = z.infer<typeof dashboardTotalsSchema>;

const dashboardTrendPointSchema = z.object({
  // UTC ISO day (YYYY-MM-DD). Rendered through formatJalali, never stored
  // or sent as a Jalali string (CLAUDE.md rule 9).
  day: z.string(),
  revenueRial: z.number(),
  orderCount: z.number(),
});
export type AdminDashboardTrendPointDto = z.infer<typeof dashboardTrendPointSchema>;

const dashboardStatusCountSchema = z.object({
  status: z.string(),
  count: z.number(),
});

const dashboardTopProductSchema = z.object({
  productId: z.string(),
  name: z.string(),
  sku: z.string(),
  qty: z.number(),
  revenueRial: z.number(),
});

const dashboardLowStockSchema = z.object({
  id: z.string(),
  name: z.string(),
  sku: z.string(),
  stock: z.number(),
  lowStockAt: z.number(),
});

const dashboardRecentOrderSchema = z.object({
  id: z.string(),
  code: z.string(),
  status: z.string(),
  totalRial: z.number(),
  createdAt: z.string(),
});

export const adminDashboardSchema = z.object({
  range: dashboardRangeSchema,
  totals: dashboardTotalsSchema,
  // The identical window immediately before `range`, so every stat tile can
  // show a real change figure instead of a context-free number.
  previousTotals: dashboardTotalsSchema,
  // Work waiting on a human right now -- deliberately NOT range-scoped: an
  // order stuck in `pending` for two months still needs handling today.
  needsAction: z.object({
    pendingOrders: z.number(),
    processingOrders: z.number(),
    lowStockProducts: z.number(),
  }),
  trend: z.array(dashboardTrendPointSchema),
  statusBreakdown: z.array(dashboardStatusCountSchema),
  topProducts: z.array(dashboardTopProductSchema),
  lowStockProducts: z.array(dashboardLowStockSchema),
  recentOrders: z.array(dashboardRecentOrderSchema),
});
export type AdminDashboardDto = z.infer<typeof adminDashboardSchema>;

export const adminDashboardResponseSchema = z.object({
  ok: z.literal(true),
  data: adminDashboardSchema,
});
