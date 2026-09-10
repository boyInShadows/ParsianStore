import type { StockReservation } from "@prisma/client";
import { prisma, type Tx } from "../../config/prisma.js";
import { ApiError } from "../../utils/ApiError.js";
import { paginate, type PaginatedResult, type PaginationQuery } from "../../utils/pagination.js";
import { moveReasonFromWire } from "../../utils/serialize.js";
import type { ProductRow } from "../catalog/pricing.js";

/**
 * Reasons travel as their wire spelling -- "manual-adjustment",
 * "reservation-released" -- because that is what the route schema validates
 * and what every existing caller passes. A Prisma enum member cannot contain
 * a hyphen, so the value is converted at this boundary; see the note in
 * utils/serialize.ts for why that mapping exists at all and what it prevents.
 */
export type MoveReason =
  | "restock"
  | "manual-adjustment"
  | "reservation"
  | "reservation-released"
  | "reservation-confirmed";

export interface AdjustStockOptions {
  byUserId?: string;
  refId?: string;
}

/**
 * The single write path for Product.stock -- InventoryMove is the audit
 * trail every change here produces.
 *
 * **This is the one place the migration buys something outright.** Under
 * Mongo the guard and the decrement had to live in one `findOneAndUpdate`
 * because that was the only atomic unit available, and the InventoryMove
 * write sat outside it with a comment admitting that a crash in between
 * would leave stock changed with no audit row -- multi-document
 * transactions need a replica set, which this project's MongoDB was not.
 * Both writes are in one transaction now. The comment is gone because the
 * hazard is.
 *
 * The conditional decrement survives unchanged in spirit: `updateMany` with
 * `stock: { gte: -delta }` in the same statement, so two concurrent
 * reservations still cannot both succeed past the last unit in stock. Its
 * `count` is the signal -- zero means the guard rejected it, not that the
 * row is missing.
 */
async function applyStockDelta(
  tx: Tx,
  productId: string,
  delta: number,
  reason: MoveReason,
  options: AdjustStockOptions & { variantId?: string } = {},
): Promise<void> {
  if (options.variantId) {
    const { count } = await tx.productVariant.updateMany({
      where: {
        id: options.variantId,
        productId,
        ...(delta < 0 ? { stock: { gte: -delta } } : {}),
      },
      data: { stock: { increment: delta } },
    });
    if (count === 0) throw new ApiError(409, "موجودی گونه کافی نیست");
  }

  const { count } = await tx.product.updateMany({
    where: { id: productId, ...(delta < 0 ? { stock: { gte: -delta } } : {}) },
    data: { stock: { increment: delta } },
  });
  if (count === 0) throw new ApiError(409, "موجودی کافی نیست");

  await tx.inventoryMove.create({
    data: {
      productId,
      delta,
      reason: moveReasonFromWire(reason),
      refId: options.refId ?? null,
      byUserId: options.byUserId ?? null,
    },
  });
}

export async function adjustStock(
  productId: string,
  delta: number,
  reason: MoveReason,
  options: AdjustStockOptions = {},
): Promise<{ id: string; stock: number }> {
  const existing = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, _count: { select: { variants: true } } },
  });
  if (!existing) {
    throw new ApiError(404, "محصول یافت نشد");
  }
  if (existing._count.variants > 0) {
    throw new ApiError(409, "موجودی محصول گونه‌دار باید از مدیر گونه‌ها تغییر کند");
  }

  return prisma.$transaction(async (tx) => {
    await applyStockDelta(tx, productId, delta, reason, options);
    const product = await tx.product.findUniqueOrThrow({
      where: { id: productId },
      select: { id: true, stock: true },
    });
    return product;
  });
}

/**
 * §3.6 Checkout: "Stock is reserved on payment initiation with a TTL,
 * released on failure/timeout." Decrements Product.stock immediately (it
 * represents *available* stock, not just on-hand) and records a
 * StockReservation that either releaseReservation() or
 * releaseExpiredReservations() below eventually resolves.
 *
 * The decrement and the reservation row are one transaction: a failure
 * between them used to be able to take stock off the shelf with nothing
 * recorded that would ever give it back.
 */
export async function reserveStock(
  productId: string,
  qty: number,
  ttlMs: number,
  refId?: string,
  variantId?: string,
): Promise<StockReservation> {
  return prisma.$transaction(async (tx) => {
    await applyStockDelta(tx, productId, -qty, "reservation", { refId, variantId });
    return tx.stockReservation.create({
      data: {
        productId,
        variantId: variantId ?? null,
        qty,
        refId: refId ?? null,
        expiresAt: new Date(Date.now() + ttlMs),
      },
    });
  });
}

async function findReservationOrThrow(reservationId: string): Promise<StockReservation> {
  const reservation = await prisma.stockReservation.findUnique({ where: { id: reservationId } });
  if (!reservation) {
    throw new ApiError(404, "رزرو موجودی یافت نشد");
  }
  return reservation;
}

/** Failure/timeout/cancel path — restores the reserved quantity. */
export async function releaseReservation(reservationId: string): Promise<void> {
  const reservation = await findReservationOrThrow(reservationId);
  await prisma.$transaction(async (tx) => {
    await applyStockDelta(tx, reservation.productId, reservation.qty, "reservation-released", {
      refId: reservationId,
      ...(reservation.variantId ? { variantId: reservation.variantId } : {}),
    });
    await tx.stockReservation.delete({ where: { id: reservationId } });
  });
}

/** Success path — the reservation becomes a real sale. Stock was already
 * decremented at reservation time, so this only closes the reservation
 * out and leaves an audit trail; it does not touch stock again. */
export async function confirmReservation(reservationId: string): Promise<void> {
  const reservation = await findReservationOrThrow(reservationId);
  await prisma.$transaction(async (tx) => {
    await tx.inventoryMove.create({
      data: {
        productId: reservation.productId,
        delta: 0,
        reason: moveReasonFromWire("reservation-confirmed"),
        refId: reservationId,
      },
    });
    await tx.stockReservation.delete({ where: { id: reservationId } });
  });
}

/** P6.S5 -- modules/checkout reserves stock per cart line with `refId` set
 * to the future Order's own id (opaque to this module, per
 * StockReservation's own "caller decides what refId means" contract).
 * These two batch helpers let checkout (rollback on a failed payment
 * initiation) and payments (the real success/failure outcome from a
 * gateway callback) resolve every reservation tied to one order without
 * either module reaching into the reservation table directly -- this
 * module stays the single place that touches it. */
export async function releaseReservationsByRefId(refId: string): Promise<void> {
  const reservations = await prisma.stockReservation.findMany({ where: { refId } });
  for (const reservation of reservations) {
    await releaseReservation(reservation.id);
  }
}

export async function confirmReservationsByRefId(refId: string): Promise<void> {
  const reservations = await prisma.stockReservation.findMany({ where: { refId } });
  for (const reservation of reservations) {
    await confirmReservation(reservation.id);
  }
}

/**
 * The whole of "reservation with TTL" now, not half of it.
 *
 * Mongo expired these rows with a TTL index, and this job existed because
 * that sweep only deleted the document -- nothing restored Product.stock.
 * PostgreSQL has no TTL index at all, so the job is not a supplement any
 * more: it is the only thing that expires a reservation. Losing it means
 * reserved stock is never returned to the shelf. See jobs/inventoryCron.ts.
 */
export async function releaseExpiredReservations(now: Date = new Date()): Promise<number> {
  const expired = await prisma.stockReservation.findMany({
    where: { expiresAt: { lte: now } },
    select: { id: true },
  });
  for (const reservation of expired) {
    await releaseReservation(reservation.id);
  }
  return expired.length;
}

/**
 * "At or below the reorder point" compares two columns of the same row,
 * which needed `$expr` under Mongo. `prisma.product.fields.lowStockAt` is
 * Prisma's field reference for exactly that.
 */
export function listLowStockProducts(
  pagination: PaginationQuery,
): Promise<PaginatedResult<ProductRow>> {
  return paginate<ProductRow>(
    prisma.product,
    "Product",
    { status: "active", stock: { lte: prisma.product.fields.lowStockAt } },
    pagination,
  );
}
