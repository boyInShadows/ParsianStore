import { Schema, model, type Model, type Types } from "mongoose";
import {
  applyBasePlugins,
  type SoftDeleteMethods,
  type WithSoftDelete,
  type WithTimestamps,
} from "./plugins.js";

export const MODERATION_STATUSES = ["pending", "approved", "rejected"] as const;
export type ModerationStatus = (typeof MODERATION_STATUSES)[number];

export interface Review extends WithTimestamps, WithSoftDelete {
  productId: Types.ObjectId;
  userId: Types.ObjectId;
  authorNameSnapshot: string;
  rating: number;
  title: string;
  body: string;
  verifiedPurchase: boolean;
  status: ModerationStatus;
  moderatedBy?: Types.ObjectId;
  moderatedAt?: Date;
}

type ReviewModelType = Model<Review, object, SoftDeleteMethods>;

const reviewSchema = new Schema<Review, ReviewModelType, SoftDeleteMethods>({
  productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  authorNameSnapshot: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  title: { type: String, required: true },
  body: { type: String, required: true },
  verifiedPurchase: { type: Boolean, required: true, default: true },
  status: {
    type: String,
    enum: MODERATION_STATUSES,
    required: true,
    default: "pending",
    index: true,
  },
  moderatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  moderatedAt: { type: Date },
});

reviewSchema.index({ userId: 1, productId: 1 }, { unique: true });
reviewSchema.index({ productId: 1, status: 1, createdAt: -1 });
applyBasePlugins(reviewSchema);

export const ReviewModel = model<Review, ReviewModelType>("Review", reviewSchema);
