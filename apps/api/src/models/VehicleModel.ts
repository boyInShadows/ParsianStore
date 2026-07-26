import { Schema, model, type Model, type Types } from "mongoose";
import {
  applyBasePlugins,
  type LocalizedName,
  type SoftDeleteMethods,
  type WithSoftDelete,
  type WithTimestamps,
} from "./plugins.js";

export const BODY_TYPES = ["sedan", "hatchback", "liftback", "pickup", "crossover"] as const;
export type BodyType = (typeof BODY_TYPES)[number];

export interface VehicleModel extends WithTimestamps, WithSoftDelete {
  makeId: Types.ObjectId;
  name: LocalizedName;
  slug: string;
  bodyType: BodyType;
}

type VehicleModelModelType = Model<VehicleModel, object, SoftDeleteMethods>;

const vehicleModelSchema = new Schema<VehicleModel, VehicleModelModelType, SoftDeleteMethods>({
  makeId: { type: Schema.Types.ObjectId, ref: "VehicleMake", required: true, index: true },
  name: {
    fa: { type: String, required: true },
    en: { type: String, required: true },
  },
  slug: { type: String, required: true },
  bodyType: { type: String, enum: BODY_TYPES, required: true },
});

// A model's slug only needs to be unique within its own make — two
// different makes could plausibly reuse a nameplate.
vehicleModelSchema.index({ makeId: 1, slug: 1 }, { unique: true });

applyBasePlugins(vehicleModelSchema);

export const VehicleModelModel = model<VehicleModel, VehicleModelModelType>(
  "VehicleModel",
  vehicleModelSchema,
);
