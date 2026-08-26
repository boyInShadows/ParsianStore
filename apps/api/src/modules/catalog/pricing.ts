import type { HydratedDocument } from "mongoose";
import type { AccountType } from "../../models/User.js";
import type { Product } from "../../models/Product.js";

// P6.S1: the ONE place effective price is decided -- every product-serving
// read path (list/detail/related/search/cart) goes through this instead of
// reimplementing the same wholesale/retail branch. `wholesalePriceRial`
// only participates when the caller's query explicitly `.select("+wholesalePriceRial")`d
// it (the field is `select: false` on the schema); a retail/guest caller's
// document simply never has it populated, so this naturally falls back to
// `priceRial` even if `accountType` were ever wrong.
export function resolveEffectivePriceRial(
  product: Pick<Product, "priceRial" | "wholesalePriceRial">,
  accountType: AccountType | undefined,
): number {
  if (accountType === "wholesale" && product.wholesalePriceRial != null) {
    return product.wholesalePriceRial;
  }
  return product.priceRial;
}

/**
 * Shapes a Product document into what's actually safe and correct to send
 * over the wire for this specific viewer:
 * - `priceRial` is overridden with the resolved effective price.
 * - `wholesalePriceRial` is always stripped, even if the query selected it
 *   -- a retail/guest viewer must never see the raw wholesale number, and a
 *   wholesale viewer only needs to know THEIR price already replaced
 *   `priceRial`, not the separate raw field.
 * - `isWholesalePrice` tells the frontend whether to show the wholesale
 *   badge, computed server-side so the client never re-derives business
 *   logic from two numbers.
 * - `compareAtRial` (retail "was/now" sale strikethrough) is dropped for
 *   wholesale viewers -- it's a different, unrelated "was" concept, and
 *   showing both at once would read as a real but wrong discount stack.
 */
export function toPublicProductJson(
  doc: HydratedDocument<Product>,
  accountType: AccountType | undefined,
): Record<string, unknown> {
  const json = doc.toJSON() as Record<string, unknown> & {
    wholesalePriceRial?: number;
    compareAtRial?: number;
  };
  const { wholesalePriceRial, compareAtRial, ...rest } = json;
  const isWholesalePrice = accountType === "wholesale" && wholesalePriceRial != null;
  const variants = doc.variants.map((variant) => {
    const variantWholesale = accountType === "wholesale" ? variant.wholesalePriceRial : undefined;
    return {
      id: variant._id!.toString(),
      name: variant.name,
      sku: variant.sku,
      priceRial: variantWholesale ?? variant.priceRial,
      isWholesalePrice: variantWholesale != null,
      stock: variant.stock,
    };
  });

  return {
    ...rest,
    priceRial: resolveEffectivePriceRial(doc, accountType),
    isWholesalePrice,
    compareAtRial: isWholesalePrice ? undefined : compareAtRial,
    variants,
  };
}
