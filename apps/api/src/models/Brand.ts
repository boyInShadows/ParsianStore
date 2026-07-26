import { Schema, model, type Model } from "mongoose";
import {
  applyBasePlugins,
  type LocalizedName,
  type SeoMeta,
  type SoftDeleteMethods,
  type WithSoftDelete,
  type WithTimestamps,
} from "./plugins.js";

export interface Brand extends WithTimestamps, WithSoftDelete {
  name: LocalizedName;
  slug: string;
  logo?: string;
  country: string;
  // Original-Equipment-Manufacturer-grade brand (Bosch, Valeo, Denso, ...)
  // vs. a house/generic brand — surfaced on the PDP as a trust signal
  // (§1.2's "Authenticity Record" differentiator).
  isOEM: boolean;
  description?: string;
  seo: SeoMeta;
}

type BrandModelType = Model<Brand, object, SoftDeleteMethods>;

const brandSchema = new Schema<Brand, BrandModelType, SoftDeleteMethods>({
  name: {
    fa: { type: String, required: true },
    en: { type: String, required: true },
  },
  slug: { type: String, required: true, unique: true },
  logo: { type: String },
  country: { type: String, required: true },
  isOEM: { type: Boolean, required: true, default: false },
  description: { type: String },
  seo: {
    title: { type: String },
    description: { type: String },
  },
});

applyBasePlugins(brandSchema);

export const BrandModel = model<Brand, BrandModelType>("Brand", brandSchema);
