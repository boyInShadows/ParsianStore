import {
  REVENUE_ORDER_STATUSES,
  type AdminDashboardDto,
  type AdminDashboardTotalsDto,
  type AdminDashboardTrendPointDto,
  type DashboardRangeDto,
} from "schemas";
import { OrderModel } from "../../models/Order.js";
import { ProductModel } from "../../models/Product.js";
import { UserModel } from "../../models/User.js";

const RANGE_DAYS: Record<DashboardRangeDto, number> = { "7d": 7, "30d": 30, "90d": 90 };

const DAY_MS = 24 * 60 * 60 * 1000;
const TOP_PRODUCT_LIMIT = 5;
const LOW_STOCK_LIMIT = 8;
const RECENT_ORDER_LIMIT = 8;

/**
 * Aggregation pipelines are NOT covered by the soft-delete query
 * middleware (models/plugins.ts says so explicitly), so every `$match`
 * below carries its own `deletedAt: null`. Getting this wrong would make
 * revenue include deleted orders -- silently, and only on this screen.
 */
const LIVE = { deletedAt: null } as const;

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

async function totalsFor(window: Window): Promise<AdminDashboardTotalsDto> {
  const [revenue] = await OrderModel.aggregate<{ revenueRial: number; orderCount: number }>([
    {
      $match: {
        ...LIVE,
        status: { $in: [...REVENUE_ORDER_STATUSES] },
        createdAt: { $gte: window.from, $lt: window.to },
      },
    },
    { $group: { _id: null, revenueRial: { $sum: "$totalRial" }, orderCount: { $sum: 1 } } },
  ]);

  const newCustomers = await UserModel.countDocuments({
    role: "customer",
    createdAt: { $gte: window.from, $lt: window.to },
  });

  const revenueRial = revenue?.revenueRial ?? 0;
  const orderCount = revenue?.orderCount ?? 0;
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
 * Days with no orders are absent from the aggregation result, not zero.
 * Rendering that array straight would draw a line that skips gaps and
 * silently lies about the shape of the week, so the range is zero-filled
 * here rather than in the chart component.
 */
async function trendFor(window: Window): Promise<AdminDashboardTrendPointDto[]> {
  const rows = await OrderModel.aggregate<{
    _id: string;
    revenueRial: number;
    orderCount: number;
  }>([
    {
      $match: {
        ...LIVE,
        status: { $in: [...REVENUE_ORDER_STATUSES] },
        createdAt: { $gte: window.from, $lt: window.to },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "UTC" } },
        revenueRial: { $sum: "$totalRial" },
        orderCount: { $sum: 1 },
      },
    },
  ]);

  const byDay = new Map(rows.map((row) => [row._id, row]));
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
  const rows = await OrderModel.aggregate<{ _id: string; count: number }>([
    { $match: { ...LIVE, createdAt: { $gte: window.from, $lt: window.to } } },
    { $group: { _id: "$status", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
  return rows.map((row) => ({ status: row._id, count: row.count }));
}

async function topProductsFor(window: Window): Promise<AdminDashboardDto["topProducts"]> {
  const rows = await OrderModel.aggregate<{
    _id: string;
    name: string;
    sku: string;
    qty: number;
    revenueRial: number;
  }>([
    {
      $match: {
        ...LIVE,
        status: { $in: [...REVENUE_ORDER_STATUSES] },
        createdAt: { $gte: window.from, $lt: window.to },
      },
    },
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.productId",
        // The snapshot on the order line, not a $lookup against the live
        // product: a renamed or deleted product must still report under the
        // name it actually sold as.
        name: { $first: "$items.nameSnapshot.fa" },
        sku: { $first: "$items.skuSnapshot" },
        qty: { $sum: "$items.qty" },
        revenueRial: { $sum: { $multiply: ["$items.priceRial", "$items.qty"] } },
      },
    },
    { $sort: { qty: -1 } },
    { $limit: TOP_PRODUCT_LIMIT },
  ]);
  return rows.map((row) => ({
    productId: String(row._id),
    name: row.name,
    sku: row.sku,
    qty: row.qty,
    revenueRial: row.revenueRial,
  }));
}

/** `stock <= lowStockAt` is a field-to-field comparison, so it needs $expr. */
const LOW_STOCK_FILTER = {
  ...LIVE,
  status: "active",
  $expr: { $lte: ["$stock", "$lowStockAt"] },
} as const;

async function lowStockProducts(): Promise<AdminDashboardDto["lowStockProducts"]> {
  const docs = await ProductModel.find(LOW_STOCK_FILTER)
    .select("name sku stock lowStockAt")
    .sort({ stock: 1 })
    .limit(LOW_STOCK_LIMIT);
  return docs.map((doc) => ({
    id: String(doc._id),
    name: doc.name.fa,
    sku: doc.sku,
    stock: doc.stock,
    lowStockAt: doc.lowStockAt,
  }));
}

async function recentOrders(): Promise<AdminDashboardDto["recentOrders"]> {
  const docs = await OrderModel.find({})
    .select("code status totalRial createdAt")
    .sort({ createdAt: -1 })
    .limit(RECENT_ORDER_LIMIT);
  return docs.map((doc) => ({
    id: String(doc._id),
    code: doc.code,
    status: doc.status,
    totalRial: doc.totalRial,
    createdAt: doc.createdAt.toISOString(),
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
    OrderModel.countDocuments({ status: "pending" }),
    OrderModel.countDocuments({ status: "processing" }),
    ProductModel.countDocuments(LOW_STOCK_FILTER),
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
