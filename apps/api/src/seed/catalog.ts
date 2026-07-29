import { pathToFileURL } from "node:url";
import { CATALOG_SYSTEMS } from "schemas";
import { connectDB, disconnectDB } from "../config/db.js";
import { logger } from "../config/logger.js";
import { BrandModel } from "../models/Brand.js";
import { CategoryModel } from "../models/Category.js";
import { FitmentModel } from "../models/Fitment.js";
import { computeProductSearchText, ProductModel } from "../models/Product.js";
import { VehicleGenModel } from "../models/VehicleGen.js";
import { VehicleModelModel } from "../models/VehicleModel.js";
import { BRAND_SEED_DATA, CATEGORY_TEMPLATES, SUPPLY_ROUTE_ROTATION } from "./catalog.data.js";
import { seedVehicles } from "./vehicles.js";
import type { Types } from "mongoose";

const VARIANTS_PER_TEMPLATE = 4;

interface FlatModel {
  makeId: Types.ObjectId;
  modelId: Types.ObjectId;
  modelSlug: string;
  genId: Types.ObjectId;
  yearFrom: number;
  yearTo: number | null;
}

/** Every seeded VehicleModel paired with its first generation — the
 * fitment target each generated product/Fitment pair uses. Real vehicles
 * from the actual P2.S6 seed tree, queried at seed time rather than
 * hardcoded, so this never drifts from whatever seedVehicles() produces. */
async function loadFlatModels(): Promise<FlatModel[]> {
  const models = await VehicleModelModel.find({});
  const flat: FlatModel[] = [];
  for (const model of models) {
    const gen = await VehicleGenModel.findOne({ modelId: model._id }).sort({ yearFrom: 1 });
    if (!gen) continue;
    flat.push({
      makeId: model.makeId,
      modelId: model._id,
      modelSlug: model.slug,
      genId: gen._id,
      yearFrom: gen.yearFrom,
      yearTo: gen.yearTo,
    });
  }
  return flat;
}

function warrantyText(months: number): string {
  return months > 0 ? `${months} ماه ضمانت` : "کالای مصرفی — بدون ضمانت زمانی";
}

/**
 * Idempotent (upsert on Product.slug, then Fitment on its natural key) —
 * >= 300 products across 10 categories/15 brands (P3.S7), generated from
 * CATEGORY_TEMPLATES x compatible vehicle models rather than 300
 * hand-written literals. Depends on the real vehicle tree (P2.S6), so it
 * seeds vehicles first if that hasn't happened yet in this run.
 */
export async function seedCatalog(): Promise<void> {
  await seedVehicles();

  for (const system of CATALOG_SYSTEMS) {
    await CategoryModel.findOneAndUpdate(
      { slug: system.slug },
      { name: system.name, slug: system.slug, systemCode: system.code, parentId: null, path: [] },
      { upsert: true, new: true },
    );
  }

  for (const brand of BRAND_SEED_DATA) {
    await BrandModel.findOneAndUpdate(
      { slug: brand.slug },
      { name: brand.name, slug: brand.slug, country: brand.country, isOEM: brand.isOEM },
      { upsert: true, new: true },
    );
  }

  const flatModels = await loadFlatModels();
  if (flatModels.length === 0) {
    throw new Error("seedCatalog: no vehicle models found — seedVehicles() produced nothing");
  }

  let productCount = 0;
  let fitmentCount = 0;
  let globalIndex = 0;

  for (const group of CATEGORY_TEMPLATES) {
    const category = await CategoryModel.findOne({ slug: group.categorySlug });
    if (!category) throw new Error(`seedCatalog: category "${group.categorySlug}" not found`);

    for (const template of group.templates) {
      for (let i = 0; i < VARIANTS_PER_TEMPLATE; i += 1) {
        const vehicle = flatModels[(globalIndex * VARIANTS_PER_TEMPLATE + i) % flatModels.length]!;
        const brand = BRAND_SEED_DATA[productCount % BRAND_SEED_DATA.length]!;
        const brandDoc = await BrandModel.findOne({ slug: brand.slug });
        const supplyRoute = SUPPLY_ROUTE_ROTATION[productCount % SUPPLY_ROUTE_ROTATION.length]!;
        const priceRial =
          template.priceMinRial +
          Math.round(
            ((template.priceMaxRial - template.priceMinRial) * i) / (VARIANTS_PER_TEMPLATE - 1),
          );
        const slug = `${template.slugBase}-${vehicle.modelSlug}`;
        const sku = `SKU-${group.categorySlug}-${template.slugBase}-${vehicle.modelSlug}`
          .toUpperCase()
          .replace(/[^A-Z0-9]+/g, "-");

        const oemNumbers = [`${template.oemPrefix}-${vehicle.modelSlug.toUpperCase()}`];
        const crossRefNumbers = [`XREF-${sku}`];

        const product = await ProductModel.findOneAndUpdate(
          { slug },
          {
            name: template.name,
            slug,
            sku,
            oemNumbers,
            crossRefNumbers,
            // findOneAndUpdate is query middleware -- Product's `pre("save")`
            // hook (document middleware) never fires here, so searchText
            // must be computed explicitly or it silently stays empty (see
            // computeProductSearchText's own doc comment for the real bug
            // this was: search against the seeded catalog was non-functional).
            searchText: computeProductSearchText({
              name: template.name,
              sku,
              oemNumbers,
              crossRefNumbers,
            }),
            brandId: brandDoc!._id,
            categoryId: category._id,
            attributes: [],
            media: [],
            priceRial,
            taxRate: 9,
            stock: 5 + (productCount % 20),
            lowStockAt: 5,
            backorderable: false,
            weightGram: template.weightGram,
            dimensions: template.dimensions,
            warranty: {
              months: template.warrantyMonths,
              text: warrantyText(template.warrantyMonths),
            },
            authenticity: {
              supplyRoute,
              sourceBrand: brand.name.en,
              countryOfManufacture: brand.country,
              verificationCode: `VER-${sku}`,
            },
            status: "active",
          },
          { upsert: true, new: true },
        );
        productCount += 1;

        await FitmentModel.findOneAndUpdate(
          {
            productId: product._id,
            makeId: vehicle.makeId,
            modelId: vehicle.modelId,
            genId: vehicle.genId,
          },
          {
            productId: product._id,
            makeId: vehicle.makeId,
            modelId: vehicle.modelId,
            genId: vehicle.genId,
            yearFrom: vehicle.yearFrom,
            yearTo: vehicle.yearTo,
            confidence: "exact",
          },
          { upsert: true, new: true },
        );
        fitmentCount += 1;
      }
      globalIndex += 1;
    }
  }

  logger.info(
    {
      products: productCount,
      fitments: fitmentCount,
      categories: CATALOG_SYSTEMS.length,
      brands: BRAND_SEED_DATA.length,
    },
    "Catalog seed complete",
  );
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  connectDB()
    .then(() => seedCatalog())
    .then(() => disconnectDB())
    .catch((err: unknown) => {
      logger.error({ err }, "Catalog seed failed");
      process.exit(1);
    });
}
