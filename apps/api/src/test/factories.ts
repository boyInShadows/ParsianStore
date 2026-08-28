import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { computeProductSearchText } from "../modules/catalog/searchText.js";

/**
 * Fixture builders for the integration suites.
 *
 * Under Mongo every test file wrote its own `ProductModel.create({...})` with
 * the full required-field payload inline, and a collection with no foreign
 * keys let it invent `brandId: new Types.ObjectId()` for references that did
 * not exist. Neither survives the move: PostgreSQL rejects a product whose
 * brand is not there, so every fixture now has to build the chain it depends
 * on -- and sixty files each doing that by hand is sixty copies of the same
 * twenty-line payload, drifting apart the moment a column is added.
 *
 * So the payloads live here once. Each builder takes the same `overrides` a
 * `create` would, fills in whatever the schema requires and the test does not
 * care about, and returns the created row.
 *
 * Uniqueness: `slug`, `sku` and `phone` are unique columns and the suites
 * share one database, so anything unique is suffixed per call rather than
 * left to the caller to remember.
 */

let counter = 0;

/** A short, collision-free suffix for unique columns. */
export function uniqueSuffix(): string {
  counter += 1;
  return `${counter}-${randomUUID().slice(0, 8)}`;
}

export async function seedBrand(overrides: Partial<Prisma.BrandCreateInput> = {}) {
  return prisma.brand.create({
    data: {
      nameFa: "بوش",
      nameEn: "Bosch",
      slug: `bosch-${uniqueSuffix()}`,
      country: "Germany",
      ...overrides,
    },
  });
}

export async function seedCategory(overrides: Partial<Prisma.CategoryCreateInput> = {}) {
  return prisma.category.create({
    data: {
      nameFa: "ترمز",
      nameEn: "Brakes",
      slug: `brakes-${uniqueSuffix()}`,
      systemCode: "SYS_04",
      ...overrides,
    },
  });
}

export interface ProductOverrides extends Partial<
  Omit<Prisma.ProductUncheckedCreateInput, "searchText">
> {
  brandId?: string;
  categoryId?: string;
}

/**
 * A sellable product, with its brand and category created alongside unless the
 * caller supplies them.
 *
 * `searchText` is derived here rather than defaulted, for the same reason
 * every other write path derives it explicitly: a product seeded without it is
 * invisible to search, which is a confusing way for a search test to fail.
 * `status` defaults to `active` because a test that seeds a product almost
 * always wants it visible; the schema's own default is `draft`.
 */
export async function seedProduct(overrides: ProductOverrides = {}) {
  const suffix = uniqueSuffix();
  const brandId = overrides.brandId ?? (await seedBrand()).id;
  const categoryId = overrides.categoryId ?? (await seedCategory()).id;
  const base = {
    nameFa: "لنت ترمز جلو",
    nameEn: "Front brake pad",
    slug: `front-brake-pad-${suffix}`,
    sku: `SKU-${suffix}`,
    oemNumbers: [],
    crossRefNumbers: [],
    priceRial: 1_500_000,
    stock: 10,
    weightGram: 800,
    lengthMm: 150,
    widthMm: 100,
    heightMm: 40,
    warrantyMonths: 12,
    warrantyText: "۱۲ ماه",
    supplyRoute: "oem" as const,
    sourceBrand: "Bosch",
    countryOfManufacture: "Germany",
    verificationCode: `VER-${suffix}`,
    status: "active" as const,
    ...overrides,
    brandId,
    categoryId,
  };
  return prisma.product.create({
    data: { ...base, searchText: computeProductSearchText(base) },
  });
}

/**
 * One full make -> model -> generation -> engine branch.
 *
 * Fitment records reference all four, and a test that only needs a make still
 * needs the rest to exist the moment it writes a fitment, so the whole branch
 * is built at once rather than four calls deep in each suite.
 */
export async function seedVehicleTree(
  overrides: {
    make?: Partial<Prisma.VehicleMakeCreateInput>;
    model?: Partial<Prisma.VehicleModelUncheckedCreateInput>;
    gen?: Partial<Prisma.VehicleGenUncheckedCreateInput>;
    engine?: Partial<Prisma.VehicleEngineUncheckedCreateInput>;
  } = {},
) {
  const suffix = uniqueSuffix();
  const make = await prisma.vehicleMake.create({
    data: {
      nameFa: "سایپا",
      nameEn: "Saipa",
      slug: `saipa-${suffix}`,
      country: "ایران",
      isDomestic: true,
      ...overrides.make,
    },
  });
  const model = await prisma.vehicleModel.create({
    data: {
      makeId: make.id,
      nameFa: "پراید",
      nameEn: "Pride",
      slug: `pride-${suffix}`,
      bodyType: "hatchback",
      ...overrides.model,
    },
  });
  const gen = await prisma.vehicleGen.create({
    data: {
      modelId: model.id,
      nameFa: "۱۳۱",
      nameEn: "131",
      yearFrom: 2008,
      yearTo: 2018,
      ...overrides.gen,
    },
  });
  const engine = await prisma.vehicleEngine.create({
    data: {
      genId: gen.id,
      code: `M13-${suffix}`,
      displacement: 1300,
      fuel: "petrol",
      power: 65,
      ...overrides.engine,
    },
  });
  return { make, model, gen, engine };
}

export async function seedUser(overrides: Partial<Prisma.UserUncheckedCreateInput> = {}) {
  return prisma.user.create({
    data: {
      // 11 digits, unique per call and stable across runs: a phone is the
      // login identity and a unique column, so two fixtures sharing one would
      // fail an insert rather than an assertion.
      phone: `09${120_000_000 + (counter += 1)}`,
      name: "کاربر آزمایشی",
      ...overrides,
    },
  });
}

export async function seedProvinceWithCity(
  overrides: {
    province?: Partial<Prisma.ProvinceCreateInput>;
    city?: Partial<Prisma.CityUncheckedCreateInput>;
  } = {},
) {
  const suffix = uniqueSuffix();
  const province = await prisma.province.create({
    data: {
      nameFa: "تهران",
      nameEn: "Tehran",
      slug: `tehran-${suffix}`,
      ...overrides.province,
    },
  });
  const city = await prisma.city.create({
    data: {
      provinceId: province.id,
      nameFa: "تهران",
      nameEn: "Tehran",
      slug: `tehran-${suffix}`,
      ...overrides.city,
    },
  });
  return { province, city };
}
