import { Schema, model, type Model } from "mongoose";
import { SHIPPING_ZONES, type ShippingZone } from "schemas";
import {
  applyBasePlugins,
  type SoftDeleteMethods,
  type WithSoftDelete,
  type WithTimestamps,
} from "./plugins.js";

// P6.S4 §3.6 "Shipping ... Zone + weight based." A real, seeded
// collection (not a static const like SHIPPING_METHODS in packages/
// schemas/src/shipping.ts) -- these Rial amounts will need real updates
// before Phase 8's admin UI ("/admin/shipping — methods & zones") exists,
// same reasoning Province/City are a real collection while
// CATALOG_SYSTEMS is a fixed const. Every seeded value here is a
// documented ESTIMATE (see seed/shipping.ts), not a fabricated-but-
// presented-as-real number -- owner confirmed directly this is fine for
// now, adjustable later.
export interface ShippingRate extends WithTimestamps, WithSoftDelete {
  methodCode: string;
  zone: ShippingZone;
  minWeightGram: number;
  // null = open-ended (the last bracket for a method+zone pair).
  maxWeightGram: number | null;
  priceRial: number;
}

type ShippingRateModelType = Model<ShippingRate, object, SoftDeleteMethods>;

const shippingRateSchema = new Schema<ShippingRate, ShippingRateModelType, SoftDeleteMethods>({
  methodCode: { type: String, required: true },
  zone: { type: String, enum: SHIPPING_ZONES, required: true },
  minWeightGram: { type: Number, required: true, min: 0 },
  maxWeightGram: { type: Number, min: 0, default: null },
  priceRial: { type: Number, required: true, min: 0 },
});

// Every /cart/estimate-shipping lookup filters by exactly this triple
// before comparing the cart's weight against min/max.
shippingRateSchema.index({ methodCode: 1, zone: 1, minWeightGram: 1 });

applyBasePlugins(shippingRateSchema);

export const ShippingRateModel = model<ShippingRate, ShippingRateModelType>(
  "ShippingRate",
  shippingRateSchema,
);
