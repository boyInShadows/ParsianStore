import { Schema, model, type Model, type Types } from "mongoose";
import {
  applyBasePlugins,
  type LocalizedName,
  type SoftDeleteMethods,
  type WithSoftDelete,
  type WithTimestamps,
} from "./plugins.js";

export interface VehicleGen extends WithTimestamps, WithSoftDelete {
  modelId: Types.ObjectId;
  name: LocalizedName;
  yearFrom: number;
  // null = still in production as of the last seed/data update.
  yearTo: number | null;
  facelift: boolean;
}

type VehicleGenModelType = Model<VehicleGen, object, SoftDeleteMethods>;

const vehicleGenSchema = new Schema<VehicleGen, VehicleGenModelType, SoftDeleteMethods>({
  modelId: { type: Schema.Types.ObjectId, ref: "VehicleModel", required: true, index: true },
  name: {
    fa: { type: String, required: true },
    en: { type: String, required: true },
  },
  yearFrom: { type: Number, required: true },
  yearTo: { type: Number, default: null },
  facelift: { type: Boolean, required: true, default: false },
});

applyBasePlugins(vehicleGenSchema);

export const VehicleGenModel = model<VehicleGen, VehicleGenModelType>(
  "VehicleGen",
  vehicleGenSchema,
);
