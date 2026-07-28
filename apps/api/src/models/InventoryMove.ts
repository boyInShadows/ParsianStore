import { Schema, model, type Model, type Types } from "mongoose";
import { applyBasePlugins, type WithSoftDelete, type WithTimestamps } from "./plugins.js";

// One entry per Product.stock change — the audit trail §3.2 names
// explicitly. `refId` is a plain string rather than an ObjectId ref to a
// single collection since what it points at depends on `reason` (a
// reservation id today; an Order id once Phase 5+ builds checkout).
export const INVENTORY_MOVE_REASONS = [
  "manual-adjustment",
  "restock",
  "reservation",
  "reservation-released",
  "reservation-confirmed",
] as const;
export type InventoryMoveReason = (typeof INVENTORY_MOVE_REASONS)[number];

export interface InventoryMove extends WithTimestamps, WithSoftDelete {
  productId: Types.ObjectId;
  delta: number;
  reason: InventoryMoveReason;
  refId?: string;
  // Absent for system-initiated moves (the expired-reservation sweep job).
  byUserId?: Types.ObjectId;
}

type InventoryMoveModelType = Model<InventoryMove>;

const inventoryMoveSchema = new Schema<InventoryMove, InventoryMoveModelType>({
  productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
  delta: { type: Number, required: true },
  reason: { type: String, enum: INVENTORY_MOVE_REASONS, required: true },
  refId: { type: String },
  byUserId: { type: Schema.Types.ObjectId, ref: "User" },
});

applyBasePlugins(inventoryMoveSchema);

export const InventoryMoveModel = model<InventoryMove, InventoryMoveModelType>(
  "InventoryMove",
  inventoryMoveSchema,
);
