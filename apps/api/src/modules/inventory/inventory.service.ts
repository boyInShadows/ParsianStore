import type { FilterQuery, HydratedDocument } from "mongoose";
import { InventoryMoveModel, type InventoryMoveReason } from "../../models/InventoryMove.js";
import { ProductModel, type Product } from "../../models/Product.js";
import { StockReservationModel, type StockReservation } from "../../models/StockReservation.js";
import { ApiError } from "../../utils/ApiError.js";
import { paginate, type PaginatedResult, type PaginationQuery } from "../../utils/pagination.js";

export interface AdjustStockOptions {
  byUserId?: string;
  refId?: string;
}

/**
 * The single write path for Product.stock (§3.2's InventoryMove is the
 * audit trail every change here produces). Atomic: the `stock >= -delta`
 * guard lives in the same findOneAndUpdate as the decrement, so two
 * concurrent reservations can't both succeed past the last unit in stock.
 *
 * Not wrapped in a transaction with the InventoryMove write below — this
 * repo's dev/CI MongoDB isn't configured as a replica set, which
 * multi-document transactions require. A crash between the two writes
 * would leave stock changed with no audit row; acceptable for now, worth
 * revisiting if a replica-set deployment target is chosen (§11).
 */
export async function adjustStock(
  productId: string,
  delta: number,
  reason: InventoryMoveReason,
  options: AdjustStockOptions = {},
): Promise<HydratedDocument<Product>> {
  const existing = await ProductModel.findById(productId, "variants");
  if (!existing) {
    throw new ApiError(404, "محصول یافت نشد");
  }
  if (existing.variants.length > 0) {
    throw new ApiError(409, "موجودی محصول گونه‌دار باید از مدیر گونه‌ها تغییر کند");
  }

  const filter: FilterQuery<Product> = { _id: productId };
  if (delta < 0) {
    filter.stock = { $gte: -delta };
  }

  const product = await ProductModel.findOneAndUpdate(
    filter,
    { $inc: { stock: delta } },
    { new: true },
  );
  if (!product) {
    throw new ApiError(409, "موجودی کافی نیست");
  }

  await InventoryMoveModel.create({
    productId,
    delta,
    reason,
    refId: options.refId,
    byUserId: options.byUserId,
  });
  return product;
}

/**
 * §3.6 Checkout: "Stock is reserved on payment initiation with a TTL,
 * released on failure/timeout." Decrements Product.stock immediately (it
 * represents *available* stock, not just on-hand) and records a
 * StockReservation that either releaseReservation() or
 * releaseExpiredReservations() below eventually resolves.
 */
export async function reserveStock(
  productId: string,
  qty: number,
  ttlMs: number,
  refId?: string,
  variantId?: string,
): Promise<HydratedDocument<StockReservation>> {
  if (variantId) {
    const product = await ProductModel.findOneAndUpdate(
      { _id: productId, variants: { $elemMatch: { _id: variantId, stock: { $gte: qty } } } },
      { $inc: { stock: -qty, "variants.$.stock": -qty } },
      { new: true },
    );
    if (!product) throw new ApiError(409, "موجودی گونه کافی نیست");
    await InventoryMoveModel.create({ productId, delta: -qty, reason: "reservation", refId });
  } else {
    await adjustStock(productId, -qty, "reservation", { refId });
  }
  return StockReservationModel.create({
    productId,
    variantId,
    qty,
    refId,
    expiresAt: new Date(Date.now() + ttlMs),
  });
}

async function findReservationOrThrow(
  reservationId: string,
): Promise<HydratedDocument<StockReservation>> {
  const reservation = await StockReservationModel.findById(reservationId);
  if (!reservation) {
    throw new ApiError(404, "رزرو موجودی یافت نشد");
  }
  return reservation;
}

/** Failure/timeout/cancel path — restores the reserved quantity. */
export async function releaseReservation(reservationId: string): Promise<void> {
  const reservation = await findReservationOrThrow(reservationId);
  if (reservation.variantId) {
    const product = await ProductModel.findOneAndUpdate(
      { _id: reservation.productId, "variants._id": reservation.variantId },
      { $inc: { stock: reservation.qty, "variants.$.stock": reservation.qty } },
      { new: true },
    );
    if (!product) throw new ApiError(404, "گونه محصول یافت نشد");
    await InventoryMoveModel.create({
      productId: reservation.productId,
      delta: reservation.qty,
      reason: "reservation-released",
      refId: reservationId,
    });
  } else {
    await adjustStock(reservation.productId.toString(), reservation.qty, "reservation-released", {
      refId: reservationId,
    });
  }
  await StockReservationModel.deleteOne({ _id: reservationId });
}

/** Success path — the reservation becomes a real sale. Stock was already
 * decremented at reservation time, so this only closes the reservation
 * out and leaves an audit trail; it does not touch stock again. */
export async function confirmReservation(reservationId: string): Promise<void> {
  const reservation = await findReservationOrThrow(reservationId);
  await InventoryMoveModel.create({
    productId: reservation.productId,
    delta: 0,
    reason: "reservation-confirmed",
    refId: reservationId,
  });
  await StockReservationModel.deleteOne({ _id: reservationId });
}

/** P6.S5 -- modules/checkout reserves stock per cart line with `refId` set
 * to the future Order's own _id (opaque to this module, per
 * StockReservation's own "caller decides what refId means" contract).
 * These two batch helpers let checkout (rollback on a failed payment
 * initiation) and payments (the real success/failure outcome from a
 * gateway callback) resolve every reservation tied to one order without
 * either module reaching into StockReservationModel directly -- this
 * module stays the single place that touches it. */
export async function releaseReservationsByRefId(refId: string): Promise<void> {
  const reservations = await StockReservationModel.find({ refId });
  for (const reservation of reservations) {
    await releaseReservation(reservation.id as string);
  }
}

export async function confirmReservationsByRefId(refId: string): Promise<void> {
  const reservations = await StockReservationModel.find({ refId });
  for (const reservation of reservations) {
    await confirmReservation(reservation.id as string);
  }
}

/**
 * The node-cron half of "reservation with TTL" (docs/db-indexes.md):
 * StockReservation's TTL index alone only deletes the document — nothing
 * hooks Mongo's background TTL sweep to restore Product.stock, so this
 * job finds and releases due reservations itself, ahead of (or instead
 * of relying on) that sweep. Returns the count released, for the caller
 * (jobs/inventoryCron.ts) to log.
 */
export async function releaseExpiredReservations(now: Date = new Date()): Promise<number> {
  const expired = await StockReservationModel.find({ expiresAt: { $lte: now } });
  for (const reservation of expired) {
    await releaseReservation(reservation.id as string);
  }
  return expired.length;
}

export function listLowStockProducts(
  pagination: PaginationQuery,
): Promise<PaginatedResult<HydratedDocument<Product>>> {
  return paginate(
    ProductModel,
    { $expr: { $lte: ["$stock", "$lowStockAt"] }, status: "active" },
    pagination,
  );
}
