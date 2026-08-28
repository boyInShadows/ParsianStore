import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { disconnectDB, resetDb } from "../../config/testDb.js";
import { InventoryMoveModel } from "../../models/InventoryMove.js";
import { ProductModel, type Product } from "../../models/Product.js";
import { StockReservationModel } from "../../models/StockReservation.js";
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
  await Promise.all([
    ProductModel.deleteMany({}),
    InventoryMoveModel.deleteMany({}),
    StockReservationModel.deleteMany({}),
  ]);
});

afterAll(async () => {
  await disconnectDB();
});

function productInput(overrides: Partial<Product> & Record<string, unknown>) {
  const sku = (overrides.sku as string) ?? `SKU-${randomUUID()}`;
  return {
    name: { fa: "لنت ترمز", en: "Brake pad" },
    slug: `brake-pad-${sku}`,
    weightGram: 800,
    dimensions: { lengthMm: 150, widthMm: 100, heightMm: 40 },
    warranty: { months: 12, text: "۱۲ ماه" },
    status: "active",
    stock: 10,
    lowStockAt: 5,
    brandId: randomUUID(),
    categoryId: randomUUID(),
    priceRial: 1_000_000,
    authenticity: {
      supplyRoute: "oem",
      sourceBrand: "Bosch",
      countryOfManufacture: "Germany",
      verificationCode: `VER-${sku}`,
    },
    ...overrides,
    sku,
  };
}

describe("adjustStock", () => {
  it("increments stock and records an InventoryMove", async () => {
    const product = await ProductModel.create(productInput({ stock: 10 }));
    const updated = await adjustStock(product.id as string, 5, "restock");
    expect(updated.stock).toBe(15);

    const moves = await InventoryMoveModel.find({ productId: product._id });
    expect(moves).toHaveLength(1);
    expect(moves[0]!.delta).toBe(5);
    expect(moves[0]!.reason).toBe("restock");
  });

  it("decrements stock when there is enough", async () => {
    const product = await ProductModel.create(productInput({ stock: 10 }));
    const updated = await adjustStock(product.id as string, -4, "manual-adjustment");
    expect(updated.stock).toBe(6);
  });

  it("rejects a decrement that would oversell (409), leaving stock unchanged", async () => {
    const product = await ProductModel.create(productInput({ stock: 2 }));
    await expect(adjustStock(product.id as string, -5, "manual-adjustment")).rejects.toThrow();

    const reloaded = await ProductModel.findById(product._id);
    expect(reloaded!.stock).toBe(2);
    expect(await InventoryMoveModel.countDocuments({})).toBe(0);
  });

  it("throws 404 for an unknown product", async () => {
    await expect(adjustStock(randomUUID(), 1, "restock")).rejects.toThrow();
  });
});

describe("reserveStock / releaseReservation / confirmReservation", () => {
  it("reserves and releases the selected variant and aggregate stock together", async () => {
    const product = await ProductModel.create(
      productInput({
        stock: 5,
        variants: [
          { name: { fa: "بزرگ", en: "Large" }, sku: "VAR-L", priceRial: 1_200_000, stock: 5 },
        ],
      }),
    );
    const variantId = product.variants[0]!._id!.toString();
    const reservation = await reserveStock(
      product.id as string,
      2,
      60_000,
      "order-variant",
      variantId,
    );
    let reloaded = await ProductModel.findById(product._id);
    expect(reloaded!.stock).toBe(3);
    expect(reloaded!.variants[0]!.stock).toBe(3);
    expect(reservation.variantId?.toString()).toBe(variantId);

    await releaseReservation(reservation.id as string);
    reloaded = await ProductModel.findById(product._id);
    expect(reloaded!.stock).toBe(5);
    expect(reloaded!.variants[0]!.stock).toBe(5);
  });

  it("rejects a variant reservation larger than that variant's stock", async () => {
    const product = await ProductModel.create(
      productInput({
        stock: 10,
        variants: [
          { name: { fa: "کوچک", en: "Small" }, sku: "VAR-S", priceRial: 900_000, stock: 1 },
        ],
      }),
    );
    await expect(
      reserveStock(
        product.id as string,
        2,
        60_000,
        undefined,
        product.variants[0]!._id!.toString(),
      ),
    ).rejects.toThrow();
    const reloaded = await ProductModel.findById(product._id);
    expect(reloaded!.stock).toBe(10);
    expect(reloaded!.variants[0]!.stock).toBe(1);
  });

  it("reserving decrements stock immediately and creates a reservation", async () => {
    const product = await ProductModel.create(productInput({ stock: 10 }));
    const reservation = await reserveStock(product.id as string, 3, 60_000, "cart-1");

    expect(reservation.qty).toBe(3);
    const reloaded = await ProductModel.findById(product._id);
    expect(reloaded!.stock).toBe(7);
  });

  it("releasing restores the reserved quantity and deletes the reservation", async () => {
    const product = await ProductModel.create(productInput({ stock: 10 }));
    const reservation = await reserveStock(product.id as string, 3, 60_000);

    await releaseReservation(reservation.id as string);

    const reloaded = await ProductModel.findById(product._id);
    expect(reloaded!.stock).toBe(10);
    expect(await StockReservationModel.findById(reservation._id)).toBeNull();
  });

  it("confirming closes the reservation without restoring stock", async () => {
    const product = await ProductModel.create(productInput({ stock: 10 }));
    const reservation = await reserveStock(product.id as string, 3, 60_000);

    await confirmReservation(reservation.id as string);

    const reloaded = await ProductModel.findById(product._id);
    expect(reloaded!.stock).toBe(7);
    expect(await StockReservationModel.findById(reservation._id)).toBeNull();
    const moves = await InventoryMoveModel.find({ reason: "reservation-confirmed" });
    expect(moves).toHaveLength(1);
  });
});

describe("releaseExpiredReservations", () => {
  it("releases every reservation past its expiresAt and restores stock for each", async () => {
    const productA = await ProductModel.create(productInput({ stock: 10 }));
    const productB = await ProductModel.create(productInput({ stock: 10 }));
    const past = new Date(Date.now() - 1000);

    const reservationA = await reserveStock(productA.id as string, 2, 0);
    const reservationB = await reserveStock(productB.id as string, 3, 0);
    await StockReservationModel.updateMany(
      { _id: { $in: [reservationA._id, reservationB._id] } },
      { expiresAt: past },
    );

    const notExpired = await reserveStock(productA.id as string, 1, 60_000);

    const count = await releaseExpiredReservations();
    expect(count).toBe(2);

    expect((await ProductModel.findById(productA._id))!.stock).toBe(9); // 10 -2(reserve) -1(reserve) +2(release)
    expect((await ProductModel.findById(productB._id))!.stock).toBe(10);
    expect(await StockReservationModel.findById(notExpired._id)).not.toBeNull();
  });

  it("is a no-op when nothing is expired", async () => {
    const count = await releaseExpiredReservations();
    expect(count).toBe(0);
  });
});

describe("listLowStockProducts", () => {
  it("returns only active products at or below their lowStockAt threshold", async () => {
    await ProductModel.create(productInput({ stock: 3, lowStockAt: 5 }));
    await ProductModel.create(productInput({ stock: 10, lowStockAt: 5 }));
    await ProductModel.create(productInput({ stock: 1, lowStockAt: 5, status: "draft" }));

    const { data } = await listLowStockProducts({ page: 1, limit: 20 });
    expect(data).toHaveLength(1);
    expect(data[0]!.stock).toBe(3);
  });
});
