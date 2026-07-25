import { Schema, model, type Model, type Types } from "mongoose";
import {
  applyBasePlugins,
  type SoftDeleteMethods,
  type WithSoftDelete,
  type WithTimestamps,
} from "./plugins.js";

export const FUEL_TYPES = ["petrol", "cng"] as const;
export type FuelType = (typeof FUEL_TYPES)[number];

export interface VehicleEngine extends WithTimestamps, WithSoftDelete {
  genId: Types.ObjectId;
  code: string;
  // Liters (e.g. 1.5), not cc — matches how these are referred to
  // everywhere else in the domain (product fitment notes, buyer search).
  displacement: number;
  fuel: FuelType;
  power: number;
}

type VehicleEngineModelType = Model<VehicleEngine, object, SoftDeleteMethods>;

const vehicleEngineSchema = new Schema<VehicleEngine, VehicleEngineModelType, SoftDeleteMethods>({
  genId: { type: Schema.Types.ObjectId, ref: "VehicleGen", required: true, index: true },
  code: { type: String, required: true },
  displacement: { type: Number, required: true },
  fuel: { type: String, enum: FUEL_TYPES, required: true },
  power: { type: Number, required: true },
});

applyBasePlugins(vehicleEngineSchema);

export const VehicleEngineModel = model<VehicleEngine, VehicleEngineModelType>(
  "VehicleEngine",
  vehicleEngineSchema,
);
