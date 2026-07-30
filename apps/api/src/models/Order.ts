import { Schema, model, type Model, type Types } from "mongoose";
import type { LocalizedName } from "./plugins.js";
import {
  applyBasePlugins,
  type SoftDeleteMethods,
  type WithSoftDelete,
  type WithTimestamps,
} from "./plugins.js";

// P6.S5 §3.2. Auth-only per P6.S2's own decision (checkout is auth-only,
// no guest checkout) -- drops the original spec's `guestPhone?`, `userId`
// is required here, never optional. Coupons stay out of scope (no admin
// CRUD exists yet to issue a code -- same gap P6.S1 hit for wholesale
// pricing) -- `discountRial` is always 0 for now, not a bolted-on-later
// field. `taxRial` likewise stays 0 -- no VAT/tax requirement is named
// anywhere in §3 for this storefront, the field exists for a future need.
export const ORDER_STATUSES = [
  "pending",
  "paid",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export interface OrderItem {
  productId: Types.ObjectId;
  nameSnapshot: LocalizedName;
  skuSnapshot: string;
  qty: number;
  priceRial: number;
}

export interface OrderStatusEntry {
  status: OrderStatus;
  at: Date;
  note?: string;
}

// A point-in-time copy, not a live Province/City/Address reference -- the
// source address (User.addresses, P6.S2) can be edited or deleted after
// the order ships, and the order must keep showing what was actually
// used at checkout time. Same "*Snapshot" philosophy as OrderItem above.
export interface OrderAddressSnapshot {
  province: LocalizedName;
  city: LocalizedName;
  line: string;
  postalCode: string;
  plate?: string;
  unit?: string;
  receiverName: string;
  receiverPhone: string;
}

export interface OrderShippingMethodSnapshot {
  code: string;
  name: LocalizedName;
  priceRial: number;
}

export interface Order extends WithTimestamps, WithSoftDelete {
  code: string;
  userId: Types.ObjectId;
  items: OrderItem[];
  subtotalRial: number;
  discountRial: number;
  shippingRial: number;
  taxRial: number;
  totalRial: number;
  address: OrderAddressSnapshot;
  shippingMethod: OrderShippingMethodSnapshot;
  trackingCode?: string;
  status: OrderStatus;
  statusHistory: OrderStatusEntry[];
  paymentId?: Types.ObjectId;
  notes?: string;
}

type OrderModelType = Model<Order, object, SoftDeleteMethods>;

const localizedNameSchema = {
  fa: { type: String, required: true },
  en: { type: String, required: true },
};

const orderItemSchema = new Schema<OrderItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    nameSnapshot: { type: localizedNameSchema, required: true },
    skuSnapshot: { type: String, required: true },
    qty: { type: Number, required: true, min: 1 },
    priceRial: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const orderStatusEntrySchema = new Schema<OrderStatusEntry>(
  {
    status: { type: String, enum: ORDER_STATUSES, required: true },
    at: { type: Date, required: true },
    note: { type: String },
  },
  { _id: false },
);

const orderAddressSnapshotSchema = new Schema<OrderAddressSnapshot>(
  {
    province: { type: localizedNameSchema, required: true },
    city: { type: localizedNameSchema, required: true },
    line: { type: String, required: true },
    postalCode: { type: String, required: true },
    plate: { type: String },
    unit: { type: String },
    receiverName: { type: String, required: true },
    receiverPhone: { type: String, required: true },
  },
  { _id: false },
);

const orderShippingMethodSnapshotSchema = new Schema<OrderShippingMethodSnapshot>(
  {
    code: { type: String, required: true },
    name: { type: localizedNameSchema, required: true },
    priceRial: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const orderSchema = new Schema<Order, OrderModelType, SoftDeleteMethods>({
  code: { type: String, required: true, unique: true },
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  items: { type: [orderItemSchema], required: true },
  subtotalRial: { type: Number, required: true, min: 0 },
  discountRial: { type: Number, required: true, min: 0, default: 0 },
  shippingRial: { type: Number, required: true, min: 0 },
  taxRial: { type: Number, required: true, min: 0, default: 0 },
  totalRial: { type: Number, required: true, min: 0 },
  address: { type: orderAddressSnapshotSchema, required: true },
  shippingMethod: { type: orderShippingMethodSnapshotSchema, required: true },
  trackingCode: { type: String },
  status: { type: String, enum: ORDER_STATUSES, required: true, default: "pending" },
  statusHistory: { type: [orderStatusEntrySchema], required: true, default: [] },
  paymentId: { type: Schema.Types.ObjectId, ref: "Payment" },
  notes: { type: String },
});

orderSchema.index({ userId: 1, createdAt: -1 });

applyBasePlugins(orderSchema);

export const OrderModel = model<Order, OrderModelType>("Order", orderSchema);
