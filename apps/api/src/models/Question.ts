import { Schema, model, type Model, type Types } from "mongoose";
import {
  applyBasePlugins,
  type SoftDeleteMethods,
  type WithSoftDelete,
  type WithTimestamps,
} from "./plugins.js";
import { MODERATION_STATUSES, type ModerationStatus } from "./Review.js";

export interface Question extends WithTimestamps, WithSoftDelete {
  productId: Types.ObjectId;
  userId: Types.ObjectId;
  authorNameSnapshot: string;
  body: string;
  status: ModerationStatus;
  answer?: string;
  answeredBy?: Types.ObjectId;
  answeredAt?: Date;
  moderatedBy?: Types.ObjectId;
  moderatedAt?: Date;
}

type QuestionModelType = Model<Question, object, SoftDeleteMethods>;
const questionSchema = new Schema<Question, QuestionModelType, SoftDeleteMethods>({
  productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  authorNameSnapshot: { type: String, required: true },
  body: { type: String, required: true },
  status: {
    type: String,
    enum: MODERATION_STATUSES,
    required: true,
    default: "pending",
    index: true,
  },
  answer: { type: String },
  answeredBy: { type: Schema.Types.ObjectId, ref: "User" },
  answeredAt: { type: Date },
  moderatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  moderatedAt: { type: Date },
});
questionSchema.index({ productId: 1, status: 1, createdAt: -1 });
applyBasePlugins(questionSchema);
export const QuestionModel = model<Question, QuestionModelType>("Question", questionSchema);
