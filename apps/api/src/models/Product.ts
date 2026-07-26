import { Schema, model, type Model, type Types } from "mongoose";
import { normalizeFa } from "schemas";
import {
  applyBasePlugins,
  type LocalizedName,
  type SeoMeta,
  type SoftDeleteMethods,
  type WithSoftDelete,
  type WithTimestamps,
} from "./plugins.js";

export const PRODUCT_STATUSES = ["draft", "active", "archived"] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

// §3.5 "Authenticity Record" supply-route options. Machine keys (not the
// literal Persian labels from §3.5) for the same reason VehicleModel's
// bodyType/VehicleEngine's fuel are English enums — display copy comes
// from apps/web's locale files (CLAUDE.md rule #4), never a hardcoded
// Persian string in the database. Persian labels, for reference:
// oem -> "OEM", genuine-imported -> "اصلی وارداتی",
// domestic -> "تولید داخل", grade1-aftermarket -> "درجه ۱ بازار".
export const SUPPLY_ROUTES = ["oem", "genuine-imported", "domestic", "grade1-aftermarket"] as const;
export type SupplyRoute = (typeof SUPPLY_ROUTES)[number];

export interface ProductAttributeValue {
  key: string;
  value: string;
}

export interface ProductDimensions {
  lengthMm: number;
  widthMm: number;
  heightMm: number;
}

export interface ProductWarranty {
  months: number;
  text: string;
}

// §3.5: evidence-shaped authenticity panel, not a static badge.
export interface ProductAuthenticity {
  supplyRoute: SupplyRoute;
  sourceBrand: string;
  countryOfManufacture: string;
  hologramCode?: string;
  guideUrl?: string;
  // Looked up by the public GET /authenticity/verify/:code (§9) — unique
  // so the endpoint resolves to exactly one product.
  verificationCode: string;
}

export interface ProductRating {
  avg: number;
  count: number;
}

export interface Product extends WithTimestamps, WithSoftDelete {
  name: LocalizedName;
  slug: string;
  sku: string;
  oemNumbers: string[];
  crossRefNumbers: string[];
  brandId: Types.ObjectId;
  categoryId: Types.ObjectId;
  attributes: ProductAttributeValue[];
  media: string[];
  priceRial: number;
  compareAtRial?: number;
  // Percentage points (9 = 9%), not a 0-1 fraction — matches how an admin
  // would actually type a tax rate into a form field.
  taxRate: number;
  stock: number;
  lowStockAt: number;
  backorderable: boolean;
  weightGram: number;
  dimensions: ProductDimensions;
  warranty: ProductWarranty;
  authenticity: ProductAuthenticity;
  status: ProductStatus;
  rating: ProductRating;
  // Auto-maintained by the pre-save hook below — never set directly by a
  // caller. Only normalizeFa()'d today; the text/prefix index over this
  // field lands with SearchProvider in P3.S4 (docs/db-indexes.md), once
  // there's a consumer for it.
  searchText: string;
  seo: SeoMeta;
}

type ProductModelType = Model<Product, object, SoftDeleteMethods>;

const productSchema = new Schema<Product, ProductModelType, SoftDeleteMethods>({
  name: {
    fa: { type: String, required: true },
    en: { type: String, required: true },
  },
  slug: { type: String, required: true, unique: true },
  sku: { type: String, required: true, unique: true },
  oemNumbers: { type: [String], default: [] },
  crossRefNumbers: { type: [String], default: [] },
  brandId: { type: Schema.Types.ObjectId, ref: "Brand", required: true, index: true },
  categoryId: { type: Schema.Types.ObjectId, ref: "Category", required: true, index: true },
  attributes: {
    type: [{ key: { type: String, required: true }, value: { type: String, required: true } }],
    default: [],
  },
  media: { type: [String], default: [] },
  priceRial: { type: Number, required: true, min: 0 },
  compareAtRial: { type: Number, min: 0 },
  taxRate: { type: Number, required: true, min: 0, default: 0 },
  stock: { type: Number, required: true, min: 0, default: 0 },
  lowStockAt: { type: Number, required: true, min: 0, default: 5 },
  backorderable: { type: Boolean, required: true, default: false },
  weightGram: { type: Number, required: true, min: 0 },
  dimensions: {
    lengthMm: { type: Number, required: true, min: 0 },
    widthMm: { type: Number, required: true, min: 0 },
    heightMm: { type: Number, required: true, min: 0 },
  },
  warranty: {
    months: { type: Number, required: true, min: 0 },
    text: { type: String, required: true },
  },
  authenticity: {
    supplyRoute: { type: String, enum: SUPPLY_ROUTES, required: true },
    sourceBrand: { type: String, required: true },
    countryOfManufacture: { type: String, required: true },
    hologramCode: { type: String },
    guideUrl: { type: String },
    verificationCode: { type: String, required: true, unique: true },
  },
  status: { type: String, enum: PRODUCT_STATUSES, required: true, default: "draft" },
  rating: {
    avg: { type: Number, required: true, default: 0, min: 0, max: 5 },
    count: { type: Number, required: true, default: 0, min: 0 },
  },
  searchText: { type: String, default: "" },
  seo: {
    title: { type: String },
    description: { type: String },
  },
});

// §9 `/catalog/products` filters by category + brand + status together —
// the compound index docs/db-indexes.md calls out explicitly for Product.
productSchema.index({ categoryId: 1, brandId: 1, status: 1 });

productSchema.pre("save", function (next) {
  const parts = [this.name.fa, this.name.en, this.sku, ...this.oemNumbers, ...this.crossRefNumbers];
  this.searchText = normalizeFa(parts.join(" "));
  next();
});

applyBasePlugins(productSchema);

export const ProductModel = model<Product, ProductModelType>("Product", productSchema);
