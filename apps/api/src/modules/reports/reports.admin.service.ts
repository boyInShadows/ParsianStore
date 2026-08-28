import { prisma } from "../../config/prisma.js";

function csvCell(value: unknown): string {
  const text = value == null ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
export function toCsv(headers: string[], rows: unknown[][]): string {
  return `\uFEFF${[headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
}

export async function reportSummary() {
  const [orders, products, customers] = await Promise.all([
    prisma.order.findMany({ select: { status: true, totalRial: true } }),
    prisma.product.findMany({ select: { stock: true, lowStockAt: true, status: true } }),
    prisma.user.count({ where: { role: "customer" } }),
  ]);
  const paid = orders.filter((order) =>
    ["paid", "processing", "shipped", "delivered"].includes(order.status),
  );
  return {
    orders: orders.length,
    revenueRial: paid.reduce((sum, order) => sum + order.totalRial, 0),
    customers,
    activeProducts: products.filter((product) => product.status === "active").length,
    lowStockProducts: products.filter(
      (product) => product.status === "active" && product.stock <= product.lowStockAt,
    ).length,
  };
}

export async function exportReport(kind: "orders" | "inventory" | "customers"): Promise<string> {
  if (kind === "orders") {
    const docs = await prisma.order.findMany({ orderBy: { createdAt: "desc" } });
    return toCsv(
      ["code", "status", "subtotalRial", "shippingRial", "totalRial", "createdAt"],
      docs.map((order) => [
        order.code,
        order.status,
        order.subtotalRial,
        order.shippingRial,
        order.totalRial,
        order.createdAt.toISOString(),
      ]),
    );
  }
  if (kind === "inventory") {
    const docs = await prisma.product.findMany({ orderBy: { sku: "asc" } });
    return toCsv(
      ["sku", "nameFa", "status", "stock", "lowStockAt", "priceRial"],
      docs.map((product) => [
        product.sku,
        product.nameFa,
        product.status,
        product.stock,
        product.lowStockAt,
        product.priceRial,
      ]),
    );
  }
  const docs = await prisma.user.findMany({
    where: { role: "customer" },
    orderBy: { createdAt: "desc" },
  });
  return toCsv(
    ["phone", "name", "email", "accountType", "createdAt"],
    docs.map((user) => [
      user.phone,
      user.name,
      user.email,
      user.accountType,
      user.createdAt.toISOString(),
    ]),
  );
}
