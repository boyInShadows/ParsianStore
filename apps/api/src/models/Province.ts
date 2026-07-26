import { Schema, model, type Model } from "mongoose";
import {
  applyBasePlugins,
  type LocalizedName,
  type SoftDeleteMethods,
  type WithSoftDelete,
  type WithTimestamps,
} from "./plugins.js";

export interface Province extends WithTimestamps, WithSoftDelete {
  name: LocalizedName;
  slug: string;
}

type ProvinceModelType = Model<Province, object, SoftDeleteMethods>;

const provinceSchema = new Schema<Province, ProvinceModelType, SoftDeleteMethods>({
  name: {
    fa: { type: String, required: true },
    en: { type: String, required: true },
  },
  slug: { type: String, required: true, unique: true },
});

applyBasePlugins(provinceSchema);

export const ProvinceModel = model<Province, ProvinceModelType>("Province", provinceSchema);
