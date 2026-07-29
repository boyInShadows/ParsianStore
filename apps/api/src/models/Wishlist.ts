import { Schema, model, type Model, type Types } from "mongoose";
import {
  applyBasePlugins,
  type SoftDeleteMethods,
  type WithSoftDelete,
  type WithTimestamps,
} from "./plugins.js";

// A dedicated collection, not an embedded array on User (unlike
// addresses/garage) -- a wishlist can grow past what's comfortable to keep
// inline on the user document, and P5.S7's list endpoint needs the
// existing page/limit `paginate()` utility (utils/pagination.ts) to query
// against, the same reasoning Fitment/StockReservation already used for
// their own dedicated collections. Removal is a real `deleteOne()` (not
// `.softDelete()`) -- a user unsaving a product has no reason to keep a
// trash record -- but every model in this codebase applies the same base
// plugin set uniformly (see StockReservation, an equally hard-deleted-via-
// TTL model that still carries it), so this one does too.
export interface Wishlist extends WithTimestamps, WithSoftDelete {
  userId: Types.ObjectId;
  productId: Types.ObjectId;
}

type WishlistModelType = Model<Wishlist, object, SoftDeleteMethods>;

const wishlistSchema = new Schema<Wishlist, WishlistModelType, SoftDeleteMethods>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
});

// Prevents duplicate saves at the DB level -- addToWishlist() also treats a
// repeat add as an idempotent no-op, this index is the backstop.
wishlistSchema.index({ userId: 1, productId: 1 }, { unique: true });
// Serves GET /me/wishlist's own list query (newest-saved first).
wishlistSchema.index({ userId: 1, createdAt: -1 });

applyBasePlugins(wishlistSchema);

export const WishlistModel = model<Wishlist, WishlistModelType>("Wishlist", wishlistSchema);
