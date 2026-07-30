import { Schema, model, type Model, type Types } from "mongoose";
import {
  applyBasePlugins,
  type SoftDeleteMethods,
  type WithSoftDelete,
  type WithTimestamps,
} from "./plugins.js";

// P6.S5 §3.2. One Payment per checkout attempt -- this step doesn't build
// a "retry with a fresh authority on the same order" flow, so orderId is
// effectively 1:1 with a live Payment for now (not enforced as a unique
// index, since a cancelled/failed order legitimately keeps its Payment
// row as history rather than being deleted).
export const PAYMENT_STATUSES = ["initiated", "success", "failed", "refunded"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export interface Payment extends WithTimestamps, WithSoftDelete {
  orderId: Types.ObjectId;
  provider: string;
  amountRial: number;
  // Known only after PaymentProvider.initiate() returns -- required for
  // any real gateway (Zarinpal's own "Authority" token), but the field
  // stays optional at the schema level for the brief window between
  // creating this row and getting the provider's response.
  authority?: string;
  // Known only after a successful PaymentProvider.verify() -- the
  // gateway's own settlement/tracking reference (Zarinpal's "RefID").
  refId?: string;
  status: PaymentStatus;
  // Whatever the provider's verify() response handed back verbatim
  // (§3.2's raw{}) -- an audit trail for support/dispute investigation,
  // never parsed back out of this field for business logic.
  raw?: unknown;
  verifiedAt?: Date;
}

type PaymentModelType = Model<Payment, object, SoftDeleteMethods>;

const paymentSchema = new Schema<Payment, PaymentModelType, SoftDeleteMethods>({
  orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true, index: true },
  provider: { type: String, required: true },
  amountRial: { type: Number, required: true, min: 0 },
  authority: { type: String },
  refId: { type: String },
  status: { type: String, enum: PAYMENT_STATUSES, required: true, default: "initiated" },
  raw: { type: Schema.Types.Mixed },
  verifiedAt: { type: Date },
});

// The payment callback (modules/payments) looks a Payment up by exactly
// this pair -- Authority alone isn't guaranteed globally unique across
// providers/environments, but (orderId, authority) together identify one
// real checkout attempt.
paymentSchema.index({ orderId: 1, authority: 1 });

applyBasePlugins(paymentSchema);

export const PaymentModel = model<Payment, PaymentModelType>("Payment", paymentSchema);
