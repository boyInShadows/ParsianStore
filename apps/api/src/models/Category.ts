import { Schema, model, type Model, type Types } from "mongoose";
import { CATALOG_SYSTEM_CODES } from "schemas";
import {
  applyBasePlugins,
  type LocalizedName,
  type SeoMeta,
  type SoftDeleteMethods,
  type WithSoftDelete,
  type WithTimestamps,
} from "./plugins.js";

export interface Category extends WithTimestamps, WithSoftDelete {
  name: LocalizedName;
  slug: string;
  parentId: Types.ObjectId | null;
  // Which of the ~10 automotive systems (packages/schemas/catalogSystems)
  // this category belongs to — a top-level "system" category references
  // itself; a subcategory references its system ancestor, so any category
  // at any depth can be grouped for the Exploded View nav (§1.3/§5.03)
  // without walking parentId chains at read time.
  systemCode: string;
  icon?: string;
  // Materialized ancestor path (root-first, self excluded) as slugs, for
  // O(1) breadcrumb rendering without recursive parentId lookups.
  path: string[];
  order: number;
  seo: SeoMeta;
}

type CategoryModelType = Model<Category, object, SoftDeleteMethods>;

const categorySchema = new Schema<Category, CategoryModelType, SoftDeleteMethods>({
  name: {
    fa: { type: String, required: true },
    en: { type: String, required: true },
  },
  slug: { type: String, required: true, unique: true },
  parentId: { type: Schema.Types.ObjectId, ref: "Category", default: null, index: true },
  systemCode: { type: String, enum: CATALOG_SYSTEM_CODES, required: true },
  icon: { type: String },
  path: { type: [String], default: [] },
  order: { type: Number, default: 0 },
  seo: {
    title: { type: String },
    description: { type: String },
  },
});

applyBasePlugins(categorySchema);

export const CategoryModel = model<Category, CategoryModelType>("Category", categorySchema);
