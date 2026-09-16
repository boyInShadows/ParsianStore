import type { ProductListItemDto, SupplyRouteDto } from "schemas";
import { CATALOG_SYSTEM_CODES } from "schemas/catalog-systems";
import {
  isBoolean,
  isLocalizedName,
  isNumber,
  isOneOf,
  isOptionalString,
  isPlainObject,
  isString,
  isStringArray,
} from "@/lib/shape-guard";

// Both the cart's line items and the wishlist's saved items embed the
// catalog's full product-card shape (cartItemSchema/wishlistItemSchema
// reuse packages/schemas/src/products.ts's productListItemSchema
// wholesale) -- shared here so P15.S8b's guard isn't duplicated in both
// fetchers/cart.ts and fetchers/wishlist.ts.
//
// `schemas/catalog-systems` is a separate, zod-free subpath (no `zod`
// import anywhere in catalogSystems.ts) -- already proven not to carry
// zod into the bundle by Header.tsx's own CATALOG_SYSTEMS import. Plain
// value imports are otherwise avoided from `schemas`/`products.ts`
// specifically because that module defines its schemas with top-level
// `z.object()`/`z.enum()` calls; importing any binding from it, even an
// unrelated plain constant, risks pulling the whole module (and zod)
// back into this graph.
//
// SUPPLY_ROUTES has no zod-free export, so it is duplicated by hand from
// packages/schemas/src/products.ts's `SUPPLY_ROUTES` -- keep the two in
// sync if the API ever adds a supply route.
const SUPPLY_ROUTES = ["oem", "genuine-imported", "domestic", "grade1-aftermarket"] as const;

function isAuthenticity(value: unknown): value is ProductListItemDto["authenticity"] {
  return (
    isPlainObject(value) &&
    isOneOf<SupplyRouteDto>(value.supplyRoute, SUPPLY_ROUTES) &&
    isString(value.sourceBrand) &&
    isString(value.countryOfManufacture) &&
    isOptionalString(value.hologramCode) &&
    isOptionalString(value.guideUrl) &&
    isString(value.verificationCode)
  );
}

export function guardProductListItem(value: unknown): value is ProductListItemDto {
  if (!isPlainObject(value)) return false;
  return (
    isString(value.id) &&
    isLocalizedName(value.name) &&
    isString(value.slug) &&
    isNumber(value.priceRial) &&
    (value.compareAtRial === undefined || isNumber(value.compareAtRial)) &&
    isBoolean(value.isWholesalePrice) &&
    isNumber(value.stock) &&
    isStringArray(value.media) &&
    (value.systemCode === undefined || isOneOf(value.systemCode, CATALOG_SYSTEM_CODES)) &&
    isAuthenticity(value.authenticity)
  );
}
