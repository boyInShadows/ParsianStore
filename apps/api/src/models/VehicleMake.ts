import { Schema, model, type Model } from "mongoose";
import {
  applyBasePlugins,
  type SoftDeleteMethods,
  type WithSoftDelete,
  type WithTimestamps,
} from "./plugins.js";

export interface LocalizedName {
  fa: string;
  en: string;
}

export interface VehicleMake extends WithTimestamps, WithSoftDelete {
  name: LocalizedName;
  slug: string;
  logo?: string;
  country: string;
  isDomestic: boolean;
}

type VehicleMakeModelType = Model<VehicleMake, object, SoftDeleteMethods>;

const vehicleMakeSchema = new Schema<VehicleMake, VehicleMakeModelType, SoftDeleteMethods>({
  name: {
    fa: { type: String, required: true },
    en: { type: String, required: true },
  },
  slug: { type: String, required: true, unique: true },
  logo: { type: String },
  country: { type: String, required: true },
  isDomestic: { type: Boolean, required: true },
});

applyBasePlugins(vehicleMakeSchema);

export const VehicleMakeModel = model<VehicleMake, VehicleMakeModelType>(
  "VehicleMake",
  vehicleMakeSchema,
);
