import { Prisma } from "@prisma/client";
import { normalizeFa, type AdminProductDetailDto, type AdminProductSummaryDto } from "schemas";
import { prisma, type Tx } from "../../config/prisma.js";
import { storageProvider } from "../../providers/storage/index.js";
import { ApiError } from "../../utils/ApiError.js";
import {
  paginate,
  type PaginatedResult,
  type PaginationQuery,
  type Where,
} from "../../utils/pagination.js";
import { localized, supplyRouteFromWire, supplyRouteToWire } from "../../utils/serialize.js";
import { validateProductAttributes } from "./attributes.service.js";
import { computeProductSearchText } from "./searchText.js";
import type { CreateProductInput, UpdateProductInput } from "./products.admin.schema.js";

// Real, honest defaults for the fields P8.S2's own create form deliberately
// excludes (owner-confirmed scope: essential fields only) -- not fabricated
// specifics, both state plainly that the real value hasn't been recorded
// yet, editable later once a full-detail admin step exists.
const DEFAULT_DIMENSIONS = { lengthMm: 100, widthMm: 100, heightMm: 100 };
const DEFAULT_WARRANTY = { months: 0, text: "اطلاعات ضمانت متعاقباً تکمیل می‌شود" };

const DETAIL_INCLUDE = {
  variants: { where: { deletedAt: null }, orderBy: { createdAt: "asc" } },
  attributes: { include: { attribute: { select: { key: true } } } },
} as const satisfies Prisma.ProductInclude;

type ProductDetailRow = Prisma.ProductGetPayload<{ include: typeof DETAIL_INCLUDE }>;

interface ProductSummaryRow {
  id: string;
  nameFa: string;
  nameEn: string;
  slug: string;
  sku: string;
  priceRial: number;
  stock: number;
  lowStockAt: number;
  status: AdminProductSummaryDto["status"];
}

export function toAdminSummary(row: ProductSummaryRow): AdminProductSummaryDto {
  return {
    id: row.id,
    name: localized(row),
    slug: row.slug,
    sku: row.sku,
    priceRial: row.priceRial,
    stock: row.stock,
    lowStockAt: row.lowStockAt,
    status: row.status,
  };
}

/**
 * The admin detail shape is deliberately the RAW essential fields -- never
 * routed through pricing.ts, which resolves an effective price for a
 * *shopper*. Admin needs to see and edit both real numbers.
 *
 * The nested `authenticity` object is rebuilt from its columns, and each
 * attribute value is paired with its dictionary key by the join rather than
 * being stored beside it. Both are storage decisions that stop at storage.
 */
export function toAdminDetail(row: ProductDetailRow): AdminProductDetailDto {
  return {
    ...toAdminSummary(row),
    ...(row.wholesalePriceRial === null ? {} : { wholesalePriceRial: row.wholesalePriceRial }),
    ...(row.compareAtRial === null ? {} : { compareAtRial: row.compareAtRial }),
    taxRate: row.taxRate,
    weightGram: row.weightGram,
    brandId: row.brandId,
    categoryId: row.categoryId,
    authenticity: {
      supplyRoute: supplyRouteToWire(
        row.supplyRoute,
      ) as AdminProductDetailDto["authenticity"]["supplyRoute"],
      sourceBrand: row.sourceBrand,
      countryOfManufacture: row.countryOfManufacture,
      ...(row.hologramCode ? { hologramCode: row.hologramCode } : {}),
      ...(row.guideUrl ? { guideUrl: row.guideUrl } : {}),
      verificationCode: row.verificationCode,
    },
    attributes: row.attributes.map((value) => ({
      key: value.attribute.key,
      value: value.value,
    })),
    media: row.media,
    variants: row.variants.map((variant) => ({
      id: variant.id,
      name: localized(variant),
      sku: variant.sku,
      priceRial: variant.priceRial,
      ...(variant.wholesalePriceRial === null
        ? {}
        : { wholesalePriceRial: variant.wholesalePriceRial }),
      stock: variant.stock,
    })),
  };
}

async function assertBrandAndCategoryExist(brandId: string, categoryId: string): Promise<void> {
  const [brand, category] = await Promise.all([
    prisma.brand.findUnique({ where: { id: brandId }, select: { id: true } }),
    prisma.category.findUnique({ where: { id: categoryId }, select: { id: true } }),
  ]);
  if (!brand) {
    throw new ApiError(400, "برند یافت نشد");
  }
  if (!category) {
    throw new ApiError(400, "دسته‌بندی یافت نشد");
  }
}

export async function listAdminProducts(
  pagination: PaginationQuery,
  filters: { status?: string; q?: string },
): Promise<PaginatedResult<AdminProductSummaryDto>> {
  const where: Where = {};
  if (filters.status) where.status = filters.status;
  // P8.S6 adds `q`: the Fitment Manager has to let staff pick one product
  // out of the whole catalog, which a paged dropdown cannot do. Matches the
  // Persian name and the SKU -- the two things staff have in front of them.
  // `normalizeFa` is applied to the query for the same reason searchText is
  // normalized on write (§8.3): normalizing only one side is the single most
  // common way Persian search breaks.
  //
  // `contains` rather than a hand-escaped regex. The needle is a bound
  // parameter, so `escapeRegExp` is no longer load-bearing here.
  if (filters.q) {
    where.OR = [
      { searchText: { contains: normalizeFa(filters.q) } },
      { sku: { contains: filters.q, mode: "insensitive" } },
    ];
  }
  const { data, meta } = await paginate<ProductSummaryRow>(prisma.product, "Product", where, {
    ...pagination,
    sort: pagination.sort ?? "-createdAt",
  });
  return { data: data.map(toAdminSummary), meta };
}

async function findDetailOrThrow(id: string): Promise<ProductDetailRow> {
  const product = await prisma.product.findUnique({ where: { id }, include: DETAIL_INCLUDE });
  if (!product) {
    throw new ApiError(404, "محصول یافت نشد");
  }
  return product;
}

export async function getAdminProductById(id: string): Promise<AdminProductDetailDto> {
  return toAdminDetail(await findDetailOrThrow(id));
}

/**
 * Turns validated `{ key, value }` pairs into rows that point at real
 * Attribute ids.
 *
 * `validateProductAttributes` has already confirmed every key exists and
 * every select value is one of its options, so a missing dictionary row here
 * would be a bug rather than bad input -- hence the throw rather than a
 * silent skip.
 */
async function toAttributeRows(
  attributes: { key: string; value: string }[],
): Promise<{ attributeId: string; value: string }[]> {
  const keys = attributes.map((attribute) => attribute.key);
  const defined = await prisma.attribute.findMany({
    where: { key: { in: keys } },
    select: { id: true, key: true },
  });
  const idByKey = new Map(defined.map((attribute) => [attribute.key, attribute.id]));
  return attributes.map((attribute) => {
    const attributeId = idByKey.get(attribute.key);
    if (!attributeId) throw new ApiError(400, `ویژگی «${attribute.key}» یافت نشد`);
    return { attributeId, value: attribute.value };
  });
}

/** The columns a create or update writes, minus the relations. */
function scalarWriteFields(input: Partial<CreateProductInput>) {
  return {
    ...(input.name ? { nameFa: input.name.fa, nameEn: input.name.en } : {}),
    ...(input.slug === undefined ? {} : { slug: input.slug }),
    ...(input.sku === undefined ? {} : { sku: input.sku }),
    ...(input.brandId === undefined ? {} : { brandId: input.brandId }),
    ...(input.categoryId === undefined ? {} : { categoryId: input.categoryId }),
    ...(input.priceRial === undefined ? {} : { priceRial: input.priceRial }),
    ...(input.wholesalePriceRial === undefined
      ? {}
      : { wholesalePriceRial: input.wholesalePriceRial }),
    ...(input.compareAtRial === undefined ? {} : { compareAtRial: input.compareAtRial }),
    ...(input.taxRate === undefined ? {} : { taxRate: input.taxRate }),
    ...(input.weightGram === undefined ? {} : { weightGram: input.weightGram }),
    ...(input.status === undefined ? {} : { status: input.status }),
    ...(input.authenticity
      ? {
          supplyRoute: supplyRouteFromWire(input.authenticity.supplyRoute),
          sourceBrand: input.authenticity.sourceBrand,
          countryOfManufacture: input.authenticity.countryOfManufacture,
          verificationCode: input.authenticity.verificationCode,
        }
      : {}),
  };
}

/**
 * `searchText` is derived at every write, explicitly.
 *
 * Under Mongoose this lived in a `pre("save")` hook, which is exactly how it
 * once silently broke -- query middleware never fired it and every seeded
 * product shipped unsearchable. searchText.ts's own comment tells that story.
 * A function every write path calls cannot fail that way, because forgetting
 * it is visible at the call site. `searchVector` follows from it in the
 * database, as a generated column.
 */
async function deriveSearchText(tx: Tx, productId: string): Promise<void> {
  const row = await tx.product.findUniqueOrThrow({
    where: { id: productId },
    select: { nameFa: true, nameEn: true, sku: true, oemNumbers: true, crossRefNumbers: true },
  });
  await tx.product.update({
    where: { id: productId },
    data: { searchText: computeProductSearchText(row) },
  });
}

export async function createProduct(input: CreateProductInput): Promise<AdminProductDetailDto> {
  await assertBrandAndCategoryExist(input.brandId, input.categoryId);
  // P8.S4: every attribute key/value is checked against the real Attribute
  // dictionary before it is stored, so a typo can never create a phantom
  // PLP facet bucket that no attribute definition can ever label.
  if (input.attributes) {
    await validateProductAttributes(input.attributes);
  }
  const attributeRows = input.attributes ? await toAttributeRows(input.attributes) : [];

  const id = await prisma.$transaction(async (tx) => {
    const created = await tx.product.create({
      data: {
        ...scalarWriteFields(input),
        nameFa: input.name.fa,
        nameEn: input.name.en,
        slug: input.slug,
        sku: input.sku,
        brandId: input.brandId,
        categoryId: input.categoryId,
        priceRial: input.priceRial,
        taxRate: input.taxRate,
        weightGram: input.weightGram,
        supplyRoute: supplyRouteFromWire(input.authenticity.supplyRoute),
        sourceBrand: input.authenticity.sourceBrand,
        countryOfManufacture: input.authenticity.countryOfManufacture,
        verificationCode: input.authenticity.verificationCode,
        // A variant-bearing product's aggregate stock is the sum of its
        // variants, never a separately-entered number that could disagree.
        stock: input.variants?.length
          ? input.variants.reduce((sum, variant) => sum + variant.stock, 0)
          : input.stock,
        lengthMm: DEFAULT_DIMENSIONS.lengthMm,
        widthMm: DEFAULT_DIMENSIONS.widthMm,
        heightMm: DEFAULT_DIMENSIONS.heightMm,
        warrantyMonths: DEFAULT_WARRANTY.months,
        warrantyText: DEFAULT_WARRANTY.text,
        ...(attributeRows.length ? { attributes: { create: attributeRows } } : {}),
        ...(input.variants?.length
          ? {
              variants: {
                create: input.variants.map((variant) => ({
                  nameFa: variant.name.fa,
                  nameEn: variant.name.en,
                  sku: variant.sku,
                  priceRial: variant.priceRial,
                  wholesalePriceRial: variant.wholesalePriceRial ?? null,
                  stock: variant.stock,
                })),
              },
            }
          : {}),
      },
      select: { id: true },
    });
    await deriveSearchText(tx, created.id);
    return created.id;
  });

  return getAdminProductById(id);
}

/**
 * Read, then write -- an update that changes `name` or `sku` must recompute
 * `searchText`, and one that replaces the variant list must re-sum the
 * aggregate stock.
 *
 * Attributes and variants are replaced wholesale when the input names them,
 * which is what "here is the new list" means and what the Mongoose version
 * did by assigning over the embedded arrays. Doing it in a transaction is
 * new: deleting the old rows and writing the new ones were two statements
 * that could previously be interrupted between.
 */
export async function updateProduct(
  id: string,
  input: UpdateProductInput,
): Promise<AdminProductDetailDto> {
  const existing = await prisma.product.findUnique({
    where: { id },
    select: { id: true, brandId: true, categoryId: true },
  });
  if (!existing) {
    throw new ApiError(404, "محصول یافت نشد");
  }
  if (input.brandId || input.categoryId) {
    await assertBrandAndCategoryExist(
      input.brandId ?? existing.brandId,
      input.categoryId ?? existing.categoryId,
    );
  }
  if (input.attributes) {
    await validateProductAttributes(input.attributes);
  }
  const attributeRows = input.attributes ? await toAttributeRows(input.attributes) : null;

  await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id },
      data: {
        ...scalarWriteFields(input),
        ...(input.variants
          ? { stock: input.variants.reduce((sum, variant) => sum + variant.stock, 0) }
          : input.stock === undefined
            ? {}
            : { stock: input.stock }),
      },
    });

    if (attributeRows) {
      await tx.productAttributeValue.deleteMany({ where: { productId: id } });
      if (attributeRows.length) {
        await tx.productAttributeValue.createMany({
          data: attributeRows.map((row) => ({ productId: id, ...row })),
        });
      }
    }

    if (input.variants) {
      await tx.productVariant.deleteMany({ where: { productId: id } });
      if (input.variants.length) {
        await tx.productVariant.createMany({
          data: input.variants.map((variant) => ({
            productId: id,
            nameFa: variant.name.fa,
            nameEn: variant.name.en,
            sku: variant.sku,
            priceRial: variant.priceRial,
            wholesalePriceRial: variant.wholesalePriceRial ?? null,
            stock: variant.stock,
          })),
        });
      }
    }

    await deriveSearchText(tx, id);
  });

  return getAdminProductById(id);
}

/** A status transition (draft/active -> archived), not `deletedAt` -- those
 * are two different concepts. `status` exists on Product exactly for this:
 * taking a listing off-sale while keeping the row, its order-history
 * references, and its own edit history intact. */
export async function archiveProduct(id: string): Promise<AdminProductDetailDto> {
  return updateProduct(id, { status: "archived" });
}

export async function addProductMedia(id: string, buffer: Buffer) {
  // Confirms the product exists before anything is written to storage --
  // otherwise a bad id leaves an orphaned image file behind.
  await findDetailOrThrow(id);
  const stored = await storageProvider.saveImage(buffer);
  const preferred = stored.variants.find((item) => item.size === "large" && item.format === "webp");
  if (!preferred) {
    await storageProvider.deleteImage(stored.key);
    throw new ApiError(500, "نسخه اصلی تصویر ساخته نشد");
  }
  await prisma.product.update({
    where: { id },
    data: { media: { push: preferred.url } },
  });
  return { product: await getAdminProductById(id), stored };
}

export async function removeProductMedia(id: string, url: string) {
  const product = await findDetailOrThrow(id);
  if (!product.media.includes(url)) throw new ApiError(404, "تصویر برای این محصول یافت نشد");
  await prisma.product.update({
    where: { id },
    data: { media: product.media.filter((item) => item !== url) },
  });
  const match = new URL(url).pathname.match(/\/uploads\/([^/]+)\//);
  if (match?.[1]) await storageProvider.deleteImage(match[1]);
  return getAdminProductById(id);
}
