import { Schema, model, type Model } from "mongoose";
import {
  applyBasePlugins,
  type SoftDeleteMethods,
  type WithSoftDelete,
  type WithTimestamps,
} from "./plugins.js";

export const ATTRIBUTE_TYPES = ["select", "number", "bool", "text"] as const;
export type AttributeType = (typeof ATTRIBUTE_TYPES)[number];

// §3.2 gives Attribute only `name{fa}`, not the {fa,en} pair every other
// catalog entity gets — these are internal admin/filter labels ("رنگ",
// "جنس"), never rendered as customer-facing bilingual copy the way a
// category or brand name is.
export interface Attribute extends WithTimestamps, WithSoftDelete {
  name: string;
  key: string;
  type: AttributeType;
  unit?: string;
  // Only meaningful for type: "select" — the fixed set of Persian option
  // labels a product's `attributes[{key,value}]` (P3.S2) value must be one
  // of. Left empty for number/bool/text attributes.
  options: string[];
}

type AttributeModelType = Model<Attribute, object, SoftDeleteMethods>;

const attributeSchema = new Schema<Attribute, AttributeModelType, SoftDeleteMethods>({
  name: { type: String, required: true },
  key: { type: String, required: true, unique: true },
  type: { type: String, enum: ATTRIBUTE_TYPES, required: true },
  unit: { type: String },
  options: { type: [String], default: [] },
});

applyBasePlugins(attributeSchema);

export const AttributeModel = model<Attribute, AttributeModelType>("Attribute", attributeSchema);
