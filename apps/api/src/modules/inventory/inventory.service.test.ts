import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../../config/prisma.js";
import { disconnectDB, resetDb } from "../../config/testDb.js";
import { seedProduct, uniqueSuffix } from "../../test/factories.js";
import {
  adjustStock,
  confirmReservation,
  listLowStockProducts,
  releaseExpiredReservations,
  releaseReservation,
  reserveStock,
} from "./inventory.service.js";

beforeAll(async () => {
  await resetDb();
});

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await disconnectDB();
});

/** Variants are their own table now, so a product with one is two writes
 * rather than an embedded array on the create. */
async function seedVariantProduct(productStock: number, variantStock: number) {
  const product = await seedProduct({ stock: productStock, lowStockAt: 5 });
  const variant = await prisma.productVariant.create({
    data: {
      productId: product.id,
      nameFa: "بزرگ",
      nameEn: "Large",
      sku: `VAR-${uniqueSuffix()}`,
      priceRial: 1_200_000,
      stock: variantStock,
    },
  });
  return { product, variant };
}

async function stockOf(productId: string): Promise<number> {
  const product = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
  return product.stock;
}

describe("adjustStock", () => {
  it("increments stock and records an InventoryMove", async () => {
    const product = await seedProduct({ stock: 10 });
    const updated = await adjustStock(product.id, 5, "restock");
    expect(updated.stock).toBe(15);

    const moves = await prisma.inventoryMove.findMany({ where: { productId: product.id } });
    expect(moves).toHaveLength(1);
    expect(moves[0]!.delta).toBe(5);
    expect(moves[0]!.reason).toBe("restock");
  });

  it("decrements stock when there is enough", async () => {
    const product = await seedProduct({ stock: 10 });
    const updated = await adjustStock(product.id, -4, "manual-adjustment");
    expect(updated.stock).toBe(6);
  });

  // The reason a Prisma enum member cannot spell: stored underscored,
  // spoken hyphenated everywhere else. See utils/serialize.ts.
  it("stores the underscored label for a hyphenated reason", async () => {
    const product = await seedProduct({ stock: 10 });
    await adjustStock(product.id, -1, "manual-adjustment");
    const move = await prisma.inventoryMove.findFirstOrThrow({
      where: { productId: product.id },
    });
    expect(move.reason).toBe("manual_adjustment");
  });

  it("rejects a decrement that would oversell (409), leaving stock unchanged", async () => {
    const product = await seedProduct({ stock: 2 });
    await expect(adjustStock(product.id, -5, "manual-adjustment")).rejects.toThrow();

    expect(await stockOf(product.id)).toBe(2);
    expect(await prisma.inventoryMove.count()).toBe(0);
  });

  it("throws 404 for an unknown product", async () => {
    await expect(adjustStock(randomUUID(), 1, "restock")).rejects.toThrow();
  });
});

describe("reserveStock / releaseReservation / confirmReservation", () => {
  it("reserves and releases the selected variant and aggregate stock together", async () => {
    const { product, variant } = await seedVariantProduct(5, 5);
    const reservation = await reserveStock(product.id, 2, 60_000, "order-variant", variant.id);

    expect(await stockOf(product.id)).toBe(3);
    expect(
      (await prisma.productVariant.findUniqueOrThrow({ where: { id: variant.id } })).stock,
    ).toBe(3);
    expect(reservation.variantId).toBe(variant.id);

    await releaseReservation(reservation.id);
    expect(await stockOf(product.id)).toBe(5);
    expect(
      (await prisma.productVariant.findUniqueOrThrow({ where: { id: variant.id } })).stock,
    ).toBe(5);
  });

  it("rejects a variant reservation larger than that variant's stock", async () => {
    const { product, variant } = await seedVariantProduct(10, 1);
    await expect(reserveStock(product.id, 2, 60_000, undefined, variant.id)).rejects.toThrow();

    // The rollback is the point: the variant guard rejects *after* nothing
    // and *before* everything, because the whole reservation is one
    // transaction now. Under Mongo the two decrements were one atomic update
    // and the reservation row a separate write with no way to tie them.
    expect(await stockOf(product.id)).toBe(10);
    expect(
      (await prisma.productVariant.findUniqueOrThrow({ where: { id: variant.id } })).stock,
    ).toBe(1);
    expect(await prisma.stockReservation.count()).toBe(0);
  });

  it("reserving decrements stock immediately and creates a reservation", async () => {
    const product = await seedProduct({ stock: 10 });
    const reservation = await reserveStock(product.id, 3, 60_000, "cart-1");

    expect(reservation.qty).toBe(3);
    expect(await stockOf(product.id)).toBe(7);
  });

  it("releasing restores the reserved quantity and deletes the reservation", async () => {
    const product = await seedProduct({ stock: 10 });
    const reservation = await reserveStock(product.id, 3, 60_000);

    await releaseReservation(reservation.id);

    expect(await stockOf(product.id)).toBe(10);
    expect(await prisma.stockReservation.findUnique({ where: { id: reservation.id } })).toBeNull();
  });

  it("confirming closes the reservation without restoring stock", async () => {
    const product = await seedProduct({ stock: 10 });
    const reservation = await reserveStock(product.id, 3, 60_000);

    await confirmReservation(reservation.id);

    expect(await stockOf(product.id)).toBe(7);
    expect(await prisma.stockReservation.findUnique({ where: { id: reservation.id } })).toBeNull();
    const moves = await prisma.inventoryMove.findMany({
      where: { reason: "reservation_confirmed" },
    });
    expect(moves).toHaveLength(1);
  });
});

describe("releaseExpiredReservations", () => {
  it("releases every reservation past its expiresAt and restores stock for each", async () => {
    const productA = await seedProduct({ stock: 10 });
    const productB = await seedProduct({ stock: 10 });
    const past = new Date(Date.now() - 1000);

    const reservationA = await reserveStock(productA.id, 2, 0);
    const reservationB = await reserveStock(productB.id, 3, 0);
    await prisma.stockReservation.updateMany({
      where: { id: { in: [reservationA.id, reservationB.id] } },
      data: { expiresAt: past },
    });

    const notExpired = await reserveStock(productA.id, 1, 60_000);

    const count = await releaseExpiredReservations();
    expect(count).toBe(2);

    // 10 -2(reserve) -1(reserve) +2(release)
    expect(await stockOf(productA.id)).toBe(9);
    expect(await stockOf(productB.id)).toBe(10);
    expect(
      await prisma.stockReservation.findUnique({ where: { id: notExpired.id } }),
    ).not.toBeNull();
  });

  it("is a no-op when nothing is expired", async () => {
    const count = await releaseExpiredReservations();
    expect(count).toBe(0);
  });
});

describe("listLowStockProducts", () => {
  it("returns only active products at or below their lowStockAt threshold", async () => {
    await seedProduct({ stock: 3, lowStockAt: 5 });
    await seedProduct({ stock: 10, lowStockAt: 5 });
    await seedProduct({ stock: 1, lowStockAt: 5, status: "draft" });

    const { data } = await listLowStockProducts({ page: 1, limit: 20 });
    expect(data).toHaveLength(1);
    expect(data[0]!.stock).toBe(3);
  });
});
