import type { AccountType } from "@prisma/client";
import type { ProductDetailDto, ProductListItemDto, SupplyRouteDto } from "schemas";
import { localized, supplyRouteToWire } from "../../utils/serialize.js";

/** The scalar columns every product-serving read path needs. */
export interface ProductRow {
  id: string;
  nameFa: string;
  nameEn: string;
  slug: string;
  sku: string;
  oemNumbers: string[];
  crossRefNumbers: string[];
  brandId: string;
  categoryId: string;
  media: string[];
  priceRial: number;
  compareAtRial: number | null;
  wholesalePriceRial: number | null;
  stock: number;
  weightGram: number;
  lengthMm: number;
  widthMm: number;
  heightMm: number;
  warrantyMonths: number;
  warrantyText: string;
  supplyRoute: string;
  sourceBrand: string;
  countryOfManufacture: string;
  hologramCode: string | null;
  guideUrl: string | null;
  verificationCode: string;
  ratingAvg: number;
  ratingCount: number;
}

export interface VariantRow {
  id: string;
  nameFa: string;
  nameEn: string;
  sku: string;
  priceRial: number;
  wholesalePriceRial: number | null;
  stock: number;
}

export interface ProductWithVariants extends ProductRow {
  variants: VariantRow[];
}

// P6.S1: the ONE place effective price is decided -- every product-serving
// read path (list/detail/related/search/cart) goes through this instead of
// reimplementing the same wholesale/retail branch.
export function resolveEffectivePriceRial(
  product: Pick<ProductRow, "priceRial" | "wholesalePriceRial">,
  accountType: AccountType | undefined,
): number {
  if (accountType === "wholesale" && product.wholesalePriceRial != null) {
    return product.wholesalePriceRial;
  }
  return product.priceRial;
}

function authenticity(row: ProductRow): ProductListItemDto["authenticity"] {
  return {
    supplyRoute: supplyRouteToWire(row.supplyRoute) as SupplyRouteDto,
    sourceBrand: row.sourceBrand,
    countryOfManufacture: row.countryOfManufacture,
    ...(row.hologramCode ? { hologramCode: row.hologramCode } : {}),
    ...(row.guideUrl ? { guideUrl: row.guideUrl } : {}),
    verificationCode: row.verificationCode,
  };
}

/**
 * Shapes a product row into what is actually safe and correct to send over the
 * wire for this specific viewer:
 * - `priceRial` is the resolved effective price.
 * - `wholesalePriceRial` is never emitted. A retail or guest viewer must never
 *   see the raw wholesale number, and a wholesale viewer only needs to know
 *   that THEIR price already replaced `priceRial`.
 * - `isWholesalePrice` drives the wholesale badge, computed server-side so the
 *   client never re-derives business logic from two numbers.
 * - `compareAtRial` (retail "was/now" strikethrough) is dropped for wholesale
 *   viewers -- a different, unrelated "was", which shown together would read
 *   as a real but wrong stacked discount.
 *
 * **This function carries more weight than it used to.** Under Mongoose,
 * `wholesalePriceRial` was `select: false`, so a query that forgot to ask for
 * it simply did not have it and could not leak it -- the schema was the first
 * line of defence and this mapping was the second. Prisma returns every
 * scalar column unless a `select` says otherwise, so there is no longer a
 * first line: building the DTO field by field, rather than spreading the row,
 * is the only thing keeping the wholesale price off the wire.
 */
export function toProductListItem(
  row: ProductRow,
  accountType: AccountType | undefined,
): ProductListItemDto {
  const isWholesalePrice = accountType === "wholesale" && row.wholesalePriceRial != null;
  return {
    id: row.id,
    name: localized(row),
    slug: row.slug,
    priceRial: resolveEffectivePriceRial(row, accountType),
    ...(isWholesalePrice || row.compareAtRial === null ? {} : { compareAtRial: row.compareAtRial }),
    isWholesalePrice,
    stock: row.stock,
    media: row.media,
    authenticity: authenticity(row),
  };
}

export interface ProductDetailAttribute {
  key: string;
  keyLabel: string;
  unit?: string;
  value: string;
}

export interface ProductRefs {
  brand: ProductDetailDto["brand"];
  category: ProductDetailDto["category"];
  attributes: ProductDetailAttribute[];
}

export function toProductDetail(
  row: ProductWithVariants,
  refs: ProductRefs,
  accountType: AccountType | undefined,
): ProductDetailDto {
  return {
    ...toProductListItem(row, accountType),
    sku: row.sku,
    oemNumbers: row.oemNumbers,
    crossRefNumbers: row.crossRefNumbers,
    attributes: refs.attributes,
    warranty: { months: row.warrantyMonths, text: row.warrantyText },
    dimensions: { lengthMm: row.lengthMm, widthMm: row.widthMm, heightMm: row.heightMm },
    weightGram: row.weightGram,
    rating: { avg: row.ratingAvg, count: row.ratingCount },
    brand: refs.brand,
    category: refs.category,
    variants: row.variants.map((variant) => {
      const variantWholesale =
        accountType === "wholesale" ? (variant.wholesalePriceRial ?? undefined) : undefined;
      return {
        id: variant.id,
        name: localized(variant),
        sku: variant.sku,
        priceRial: variantWholesale ?? variant.priceRial,
        isWholesalePrice: variantWholesale != null,
        stock: variant.stock,
      };
    }),
  };
}
