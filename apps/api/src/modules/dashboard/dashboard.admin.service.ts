import { Prisma } from "@prisma/client";
import {
  REVENUE_ORDER_STATUSES,
  type AdminDashboardDto,
  type AdminDashboardTotalsDto,
  type AdminDashboardTrendPointDto,
  type DashboardRangeDto,
} from "schemas";
import { prisma } from "../../config/prisma.js";
import type { Where } from "../../utils/pagination.js";

const RANGE_DAYS: Record<DashboardRangeDto, number> = { "7d": 7, "30d": 30, "90d": 90 };

const DAY_MS = 24 * 60 * 60 * 1000;
const TOP_PRODUCT_LIMIT = 5;
const LOW_STOCK_LIMIT = 8;
const RECENT_ORDER_LIMIT = 8;

interface Window {
  from: Date;
  to: Date;
  days: number;
}

/**
 * Buckets are whole UTC days so a point on the trend line always means
 * "one calendar day", never a partial slice that dips at the right-hand
 * edge for no reason. The current day is included, hence `days - 1`.
 */
function toWindows(range: DashboardRangeDto, now: Date): { current: Window; previous: Window } {
  const days = RANGE_DAYS[range];
  const startOfToday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const from = new Date(startOfToday.getTime() - (days - 1) * DAY_MS);
  const previousFrom = new Date(from.getTime() - days * DAY_MS);
  return {
    current: { from, to: now, days },
    previous: { from: previousFrom, to: from, days },
  };
}

function toDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * The revenue window, as a `where`.
 *
 * The Mongo version of this file opened with a warning that aggregation
 * pipelines bypass the soft-delete middleware, so every `$match` had to
 * repeat `deletedAt: null` or revenue would silently include deleted orders.
 * Prisma's client extension does reach `aggregate`, `count` and `groupBy`, so
 * that hazard is gone for those -- but **not** for the two `$queryRaw` calls
 * below, which the extension cannot see into. Those spell the condition out
 * in SQL, and that is the one place this warning still applies.
 */
function revenueWindow(window: Window): Where {
  return {
    status: { in: [...REVENUE_ORDER_STATUSES] },
    createdAt: { gte: window.from, lt: window.to },
  };
}

async function totalsFor(window: Window): Promise<AdminDashboardTotalsDto> {
  const [revenue, newCustomers] = await Promise.all([
    prisma.order.aggregate({
      where: revenueWindow(window),
      _sum: { totalRial: true },
      _count: { _all: true },
    }),
    prisma.user.count({
      where: { role: "customer", createdAt: { gte: window.from, lt: window.to } },
    }),
  ]);

  const revenueRial = revenue._sum.totalRial ?? 0;
  const orderCount = revenue._count._all;
  return {
    revenueRial,
    orderCount,
    // Integer Rial. `Math.round` on a Rial sum is exact enough (the unit is
    // already the smallest one the domain has) and keeps the money rule --
    // no float ever reaches a response body or a formatToman call.
    averageOrderRial: orderCount === 0 ? 0 : Math.round(revenueRial / orderCount),
    newCustomers,
  };
}

/**
 * Days with no orders are absent from the grouped result, not zero.
 * Rendering that array straight would draw a line that skips gaps and
 * silently lies about the shape of the week, so the range is zero-filled
 * here rather than in the chart component.
 *
 * Raw SQL because the bucket is an expression over a column, which
 * `groupBy` cannot express -- Mongo used `$dateToString` for the same
 * reason. The counts are cast to `int` in the query: PostgreSQL's `sum`
 * and `count` return bigint, which arrives as a JS `BigInt` and would
 * serialise into the response as a string.
 */
async function trendFor(window: Window): Promise<AdminDashboardTrendPointDto[]> {
  const rows = await prisma.$queryRaw<{ day: string; revenueRial: number; orderCount: number }[]>`
    SELECT to_char(date_trunc('day', "createdAt" AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS "day",
           COALESCE(sum("totalRial"), 0)::int AS "revenueRial",
           count(*)::int AS "orderCount"
      FROM "Order"
     WHERE "deletedAt" IS NULL
       AND "status"::text IN (${Prisma.join([...REVENUE_ORDER_STATUSES])})
       AND "createdAt" >= ${window.from}
       AND "createdAt" < ${window.to}
     GROUP BY 1
  `;

  const byDay = new Map(rows.map((row) => [row.day, row]));
  return Array.from({ length: window.days }, (_unused, index) => {
    const day = toDayKey(new Date(window.from.getTime() + index * DAY_MS));
    const row = byDay.get(day);
    return {
      day,
      revenueRial: row?.revenueRial ?? 0,
      orderCount: row?.orderCount ?? 0,
    };
  });
}

async function statusBreakdownFor(window: Window): Promise<{ status: string; count: number }[]> {
  const rows = await prisma.order.groupBy({
    by: ["status"],
    where: { createdAt: { gte: window.from, lt: window.to } },
    _count: { _all: true },
    orderBy: { _count: { status: "desc" } },
  });
  return rows.map((row) => ({ status: row.status, count: row._count._all }));
}

/**
 * Raw SQL for the same reason as the trend: revenue per product is
 * `sum(priceRial * qty)`, an expression `groupBy`'s `_sum` cannot take. The
 * snapshot columns are read rather than joining the live product, so a
 * renamed or since-deleted part still reports under the name it sold as --
 * which was the Mongo version's reason for `$first` on the snapshot too.
 */
async function topProductsFor(window: Window): Promise<AdminDashboardDto["topProducts"]> {
  return prisma.$queryRaw<AdminDashboardDto["topProducts"]>`
    SELECT i."productId"                            AS "productId",
           min(i."nameFaSnapshot")                  AS "name",
           min(i."skuSnapshot")                     AS "sku",
           sum(i."qty")::int                        AS "qty",
           sum(i."priceRial" * i."qty")::int        AS "revenueRial"
      FROM "OrderItem" i
      JOIN "Order" o ON o."id" = i."orderId"
     WHERE o."deletedAt" IS NULL
       AND o."status"::text IN (${Prisma.join([...REVENUE_ORDER_STATUSES])})
       AND o."createdAt" >= ${window.from}
       AND o."createdAt" < ${window.to}
     GROUP BY i."productId"
     ORDER BY "qty" DESC
     LIMIT ${TOP_PRODUCT_LIMIT}
  `;
}

/** `stock <= lowStockAt` compares two columns, which needed `$expr` under
 * Mongo and is a Prisma field reference here. */
const lowStockFilter = (): Where => ({
  status: "active",
  stock: { lte: prisma.product.fields.lowStockAt },
});

async function lowStockProducts(): Promise<AdminDashboardDto["lowStockProducts"]> {
  const rows = await prisma.product.findMany({
    where: lowStockFilter(),
    select: { id: true, nameFa: true, sku: true, stock: true, lowStockAt: true },
    orderBy: { stock: "asc" },
    take: LOW_STOCK_LIMIT,
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.nameFa,
    sku: row.sku,
    stock: row.stock,
    lowStockAt: row.lowStockAt,
  }));
}

async function recentOrders(): Promise<AdminDashboardDto["recentOrders"]> {
  const rows = await prisma.order.findMany({
    select: { id: true, code: true, status: true, totalRial: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: RECENT_ORDER_LIMIT,
  });
  return rows.map((row) => ({
    id: row.id,
    code: row.code,
    status: row.status,
    totalRial: row.totalRial,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function getAdminDashboard(
  range: DashboardRangeDto,
  now: Date = new Date(),
): Promise<AdminDashboardDto> {
  const { current, previous } = toWindows(range, now);

  const [
    totals,
    previousTotals,
    trend,
    statusBreakdown,
    topProducts,
    lowStock,
    recent,
    pendingOrders,
    processingOrders,
    lowStockCount,
  ] = await Promise.all([
    totalsFor(current),
    totalsFor(previous),
    trendFor(current),
    statusBreakdownFor(current),
    topProductsFor(current),
    lowStockProducts(),
    recentOrders(),
    prisma.order.count({ where: { status: "pending" } }),
    prisma.order.count({ where: { status: "processing" } }),
    prisma.product.count({ where: lowStockFilter() }),
  ]);

  return {
    range,
    totals,
    previousTotals,
    needsAction: { pendingOrders, processingOrders, lowStockProducts: lowStockCount },
    trend,
    statusBreakdown,
    topProducts,
    lowStockProducts: lowStock,
    recentOrders: recent,
  };
}
