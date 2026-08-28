import { pathToFileURL } from "node:url";
import type { ShippingRate } from "@prisma/client";
import { logger } from "../config/logger.js";
import { connectDB, disconnectDB, prisma } from "../config/prisma.js";

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

/**
 * Idempotent on the methodCode+zone+minWeightGram natural key -- safe to
 * re-run on every deploy, and the intended way to push a real rate update
 * before Phase 8's admin UI exists.
 *
 * Find-then-write rather than `upsert`, because that natural key is no longer
 * a database constraint. P10.S14 removed it: rates are soft-deletable, and a
 * plain unique counts tombstoned rows, so a deleted band could never be
 * recreated. The seed matches live rows only -- a band staff deliberately
 * deleted stays deleted rather than being resurrected by the next deploy.
 */
export async function seedShipping(): Promise<void> {
  let rates = 0;

  for (const row of SHIPPING_RATE_SEED_DATA) {
    const existing = await prisma.shippingRate.findFirst({
      where: {
        methodCode: row.methodCode,
        zone: row.zone,
        minWeightGram: row.minWeightGram,
      },
      select: { id: true },
    });
    if (existing) {
      await prisma.shippingRate.update({ where: { id: existing.id }, data: row });
    } else {
      await prisma.shippingRate.create({ data: row });
    }
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
