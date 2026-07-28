import { Schema, model, type Model, type Types } from "mongoose";
import {
  applyBasePlugins,
  type SoftDeleteMethods,
  type WithSoftDelete,
  type WithTimestamps,
} from "./plugins.js";

// §3.4's PDP verdict banner has exactly these three states for a matched
// record; "no fitment record at all" is a separate, fourth UI state the
// service layer represents as `confidence: null` — never stored here.
export const FITMENT_CONFIDENCES = ["exact", "likely", "check"] as const;
export type FitmentConfidence = (typeof FITMENT_CONFIDENCES)[number];

export interface Fitment extends WithTimestamps, WithSoftDelete {
  productId: Types.ObjectId;
  makeId: Types.ObjectId;
  modelId: Types.ObjectId;
  // Omitted = this record applies across every generation of the model
  // within [yearFrom, yearTo] — coarser data than a generation-specific
  // record, but real for a supplier who only knows "fits Pride 2005-2010".
  genId?: Types.ObjectId;
  // Omitted = applies regardless of engine variant.
  engineId?: Types.ObjectId;
  yearFrom: number;
  // null = still fits the current production run (mirrors VehicleGen.yearTo).
  yearTo: number | null;
  note?: string;
  confidence: FitmentConfidence;
}

type FitmentModelType = Model<Fitment, object, SoftDeleteMethods>;

const fitmentSchema = new Schema<Fitment, FitmentModelType, SoftDeleteMethods>({
  productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
  makeId: { type: Schema.Types.ObjectId, ref: "VehicleMake", required: true },
  modelId: { type: Schema.Types.ObjectId, ref: "VehicleModel", required: true },
  genId: { type: Schema.Types.ObjectId, ref: "VehicleGen" },
  engineId: { type: Schema.Types.ObjectId, ref: "VehicleEngine" },
  yearFrom: { type: Number, required: true },
  yearTo: { type: Number, default: null },
  note: { type: String },
  confidence: { type: String, enum: FITMENT_CONFIDENCES, required: true },
});

// §3.2 names this compound index explicitly: `/fitment/check` (§9) is a
// hot path a single-field index can't serve efficiently.
fitmentSchema.index({ makeId: 1, modelId: 1, genId: 1, yearFrom: 1, yearTo: 1 });

applyBasePlugins(fitmentSchema);

export const FitmentModel = model<Fitment, FitmentModelType>("Fitment", fitmentSchema);
