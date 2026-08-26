import { Schema, model, type Model, type Types } from "mongoose";
import { applyBasePlugins, type WithSoftDelete, type WithTimestamps } from "./plugins.js";

// Not in §3.2's model list — introduced ahead of Cart/Order (Phase 5+,
// not yet built) as the self-contained half of P3.S6's "reservation with
// TTL" requirement. §3.6 Checkout: "Stock is reserved on payment
// initiation with a TTL, released on failure/timeout" — once Cart/Order
// exist, they create/consume these through modules/inventory's service
// functions rather than touching Product.stock directly.
export interface StockReservation extends WithTimestamps, WithSoftDelete {
  productId: Types.ObjectId;
  variantId?: Types.ObjectId;
  qty: number;
  // A cart/order id once those models exist; opaque today.
  refId?: string;
  expiresAt: Date;
}

type StockReservationModelType = Model<StockReservation>;

const stockReservationSchema = new Schema<StockReservation, StockReservationModelType>({
  productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
  variantId: { type: Schema.Types.ObjectId },
  qty: { type: Number, required: true, min: 1 },
  refId: { type: String },
  expiresAt: { type: Date, required: true },
});

// docs/db-indexes.md: TTL indexes clean up the document itself, but the
// Product.stock restore on expiry needs an app-level reaction Mongo's TTL
// monitor can't provide (see jobs/releaseExpiredReservations.ts) — this
// index is a backstop that guarantees the reservation document itself
// never outlives its expiry even if that job is ever delayed or down.
stockReservationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

applyBasePlugins(stockReservationSchema);

export const StockReservationModel = model<StockReservation, StockReservationModelType>(
  "StockReservation",
  stockReservationSchema,
);
