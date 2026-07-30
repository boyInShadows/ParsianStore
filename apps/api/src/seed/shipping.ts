import { pathToFileURL } from "node:url";
import { connectDB, disconnectDB } from "../config/db.js";
import { logger } from "../config/logger.js";
import { ShippingRateModel, type ShippingRate } from "../models/ShippingRate.js";

// P6.S4: every priceRial below is a documented ESTIMATE, not real courier
// contract pricing -- the owner confirmed directly (asked, not guessed)
// that seeding reasonable placeholder rates now, clearly flagged, is
// fine pending real data via Phase 8's admin UI or a future reseed.
// Weight-dependent methods (post-pishtaz/tipax/chapar) get 4 brackets x
// 2 zones; intracity is a single flat Tehran-only bracket (no weight
// dependency for a same-city courier run).
type SeedRow = Pick<
  ShippingRate,
  "methodCode" | "zone" | "minWeightGram" | "maxWeightGram" | "priceRial"
>;

const SHIPPING_RATE_SEED_DATA: SeedRow[] = [
  // post-pishtaz
  {
    methodCode: "post-pishtaz",
    zone: "tehran",
    minWeightGram: 0,
    maxWeightGram: 1000,
    priceRial: 250_000,
  },
  {
    methodCode: "post-pishtaz",
    zone: "tehran",
    minWeightGram: 1000,
    maxWeightGram: 2000,
    priceRial: 350_000,
  },
  {
    methodCode: "post-pishtaz",
    zone: "tehran",
    minWeightGram: 2000,
    maxWeightGram: 5000,
    priceRial: 550_000,
  },
  {
    methodCode: "post-pishtaz",
    zone: "tehran",
    minWeightGram: 5000,
    maxWeightGram: null,
    priceRial: 850_000,
  },
  {
    methodCode: "post-pishtaz",
    zone: "other",
    minWeightGram: 0,
    maxWeightGram: 1000,
    priceRial: 350_000,
  },
  {
    methodCode: "post-pishtaz",
    zone: "other",
    minWeightGram: 1000,
    maxWeightGram: 2000,
    priceRial: 500_000,
  },
  {
    methodCode: "post-pishtaz",
    zone: "other",
    minWeightGram: 2000,
    maxWeightGram: 5000,
    priceRial: 750_000,
  },
  {
    methodCode: "post-pishtaz",
    zone: "other",
    minWeightGram: 5000,
    maxWeightGram: null,
    priceRial: 1_100_000,
  },
  // tipax
  {
    methodCode: "tipax",
    zone: "tehran",
    minWeightGram: 0,
    maxWeightGram: 1000,
    priceRial: 300_000,
  },
  {
    methodCode: "tipax",
    zone: "tehran",
    minWeightGram: 1000,
    maxWeightGram: 2000,
    priceRial: 420_000,
  },
  {
    methodCode: "tipax",
    zone: "tehran",
    minWeightGram: 2000,
    maxWeightGram: 5000,
    priceRial: 650_000,
  },
  {
    methodCode: "tipax",
    zone: "tehran",
    minWeightGram: 5000,
    maxWeightGram: null,
    priceRial: 950_000,
  },
  { methodCode: "tipax", zone: "other", minWeightGram: 0, maxWeightGram: 1000, priceRial: 420_000 },
  {
    methodCode: "tipax",
    zone: "other",
    minWeightGram: 1000,
    maxWeightGram: 2000,
    priceRial: 600_000,
  },
  {
    methodCode: "tipax",
    zone: "other",
    minWeightGram: 2000,
    maxWeightGram: 5000,
    priceRial: 900_000,
  },
  {
    methodCode: "tipax",
    zone: "other",
    minWeightGram: 5000,
    maxWeightGram: null,
    priceRial: 1_300_000,
  },
  // chapar
  {
    methodCode: "chapar",
    zone: "tehran",
    minWeightGram: 0,
    maxWeightGram: 1000,
    priceRial: 280_000,
  },
  {
    methodCode: "chapar",
    zone: "tehran",
    minWeightGram: 1000,
    maxWeightGram: 2000,
    priceRial: 390_000,
  },
  {
    methodCode: "chapar",
    zone: "tehran",
    minWeightGram: 2000,
    maxWeightGram: 5000,
    priceRial: 600_000,
  },
  {
    methodCode: "chapar",
    zone: "tehran",
    minWeightGram: 5000,
    maxWeightGram: null,
    priceRial: 900_000,
  },
  {
    methodCode: "chapar",
    zone: "other",
    minWeightGram: 0,
    maxWeightGram: 1000,
    priceRial: 380_000,
  },
  {
    methodCode: "chapar",
    zone: "other",
    minWeightGram: 1000,
    maxWeightGram: 2000,
    priceRial: 550_000,
  },
  {
    methodCode: "chapar",
    zone: "other",
    minWeightGram: 2000,
    maxWeightGram: 5000,
    priceRial: 820_000,
  },
  {
    methodCode: "chapar",
    zone: "other",
    minWeightGram: 5000,
    maxWeightGram: null,
    priceRial: 1_200_000,
  },
  // intracity -- flat, Tehran-only
  {
    methodCode: "intracity",
    zone: "tehran",
    minWeightGram: 0,
    maxWeightGram: null,
    priceRial: 150_000,
  },
];

/** Idempotent (upsert on the methodCode+zone+minWeightGram natural key)
 * -- safe to re-run on every deploy, and the intended way to push a real
 * rate update before Phase 8's admin UI exists. */
export async function seedShipping(): Promise<void> {
  let rates = 0;

  for (const row of SHIPPING_RATE_SEED_DATA) {
    await ShippingRateModel.findOneAndUpdate(
      { methodCode: row.methodCode, zone: row.zone, minWeightGram: row.minWeightGram },
      row,
      { upsert: true, new: true },
    );
    rates += 1;
  }

  logger.info({ rates }, "Shipping rate seed complete");
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  connectDB()
    .then(() => seedShipping())
    .then(() => disconnectDB())
    .catch((err: unknown) => {
      logger.error({ err }, "Shipping rate seed failed");
      process.exit(1);
    });
}
