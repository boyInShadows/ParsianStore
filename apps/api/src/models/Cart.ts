import { Schema, model, type Model, type Types } from "mongoose";
import {
  applyBasePlugins,
  type SoftDeleteMethods,
  type WithSoftDelete,
  type WithTimestamps,
} from "./plugins.js";

const CART_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function nextCartExpiry(): Date {
  return new Date(Date.now() + CART_TTL_MS);
}

export interface CartItem {
  // `{_id:true}` on the subdocument schema below gives every line item a
  // real id -- declared here (unlike Address/GarageEntry) because cart
  // routes need to address a specific line via PATCH/DELETE /cart/items/:id.
  _id?: Types.ObjectId;
  productId: Types.ObjectId;
  variantId?: Types.ObjectId;
  qty: number;
  // Captured at add-time for a "price changed since you added this" UI
  // hint only -- every real total is computed from live Product.priceRial
  // at read time (§3.6: "cart totals recomputed server-side at every
  // step"), never trusted from this snapshot.
  priceRialSnapshot: number;
}

// A dedicated collection, not embedded on User (unlike addresses/garage) --
// matches Wishlist's reasoning (its own document, a TTL index per §3.2).
// A Cart document has exactly one of userId/anonId, always -- never both,
// never neither (see cart.service.ts's find-or-create).
export interface Cart extends WithTimestamps, WithSoftDelete {
  userId?: Types.ObjectId;
  anonId?: string;
  items: CartItem[];
  // P6.S7: the code a shopper applied, if any. Never trusted as-is --
  // cart.service.ts's getCart() re-validates it live against the
  // Coupon model and the cart's own current subtotal on every read.
  couponCode?: string;
  expiresAt: Date;
}

type CartModelType = Model<Cart, object, SoftDeleteMethods>;

const cartItemSchema = new Schema<CartItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    variantId: { type: Schema.Types.ObjectId },
    qty: { type: Number, required: true, min: 1 },
    priceRialSnapshot: { type: Number, required: true, min: 0 },
  },
  { _id: true },
);

const cartSchema = new Schema<Cart, CartModelType, SoftDeleteMethods>({
  userId: { type: Schema.Types.ObjectId, ref: "User" },
  anonId: { type: String },
  items: { type: [cartItemSchema], default: [] },
  couponCode: { type: String },
  expiresAt: { type: Date, required: true, default: nextCartExpiry },
});

// Sparse: a cart is missing exactly one of these two fields, and sparse
// indexes exclude documents where the indexed field is absent entirely --
// without `sparse`, every guest cart's missing `userId` (or every
// authenticated cart's missing `anonId`) would collide as duplicate
// `null` keys.
cartSchema.index({ userId: 1 }, { unique: true, sparse: true });
cartSchema.index({ anonId: 1 }, { unique: true, sparse: true });
// An abandoned cart self-expires -- same TTL pattern as StockReservation,
// refreshed on every mutation (see cart.service.ts) so an active cart
// never expires mid-use.
cartSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

applyBasePlugins(cartSchema);

export const CartModel = model<Cart, CartModelType>("Cart", cartSchema);
