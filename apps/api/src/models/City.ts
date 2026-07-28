import { Schema, model, type Model, type Types } from "mongoose";
import {
  applyBasePlugins,
  type LocalizedName,
  type SoftDeleteMethods,
  type WithSoftDelete,
  type WithTimestamps,
} from "./plugins.js";

export interface City extends WithTimestamps, WithSoftDelete {
  provinceId: Types.ObjectId;
  name: LocalizedName;
  slug: string;
}

type CityModelType = Model<City, object, SoftDeleteMethods>;

const citySchema = new Schema<City, CityModelType, SoftDeleteMethods>({
  provinceId: { type: Schema.Types.ObjectId, ref: "Province", required: true, index: true },
  name: {
    fa: { type: String, required: true },
    en: { type: String, required: true },
  },
  slug: { type: String, required: true },
});

// A city's slug only needs to be unique within its own province — two
// different provinces could plausibly share a city name.
citySchema.index({ provinceId: 1, slug: 1 }, { unique: true });

applyBasePlugins(citySchema);

export const CityModel = model<City, CityModelType>("City", citySchema);
