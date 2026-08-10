import { OrderModel } from "../../models/Order.js";
import { ProductModel } from "../../models/Product.js";
import { UserModel } from "../../models/User.js";

function csvCell(value: unknown): string {
  const text = value == null ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
export function toCsv(headers: string[], rows: unknown[][]): string {
  return `\uFEFF${[headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
}

export async function reportSummary() {
  const [orders, products, customers] = await Promise.all([
    OrderModel.find({}, "status totalRial"),
    ProductModel.find({}, "stock lowStockAt status"),
    UserModel.countDocuments({ role: "customer" }),
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
    const docs = await OrderModel.find().sort({ createdAt: -1 });
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
    const docs = await ProductModel.find().sort({ sku: 1 });
    return toCsv(
      ["sku", "nameFa", "status", "stock", "lowStockAt", "priceRial"],
      docs.map((product) => [
        product.sku,
        product.name.fa,
        product.status,
        product.stock,
        product.lowStockAt,
        product.priceRial,
      ]),
    );
  }
  const docs = await UserModel.find({ role: "customer" }).sort({ createdAt: -1 });
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
