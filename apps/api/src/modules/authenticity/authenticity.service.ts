import { ProductModel } from "../../models/Product.js";
import type { LocalizedName } from "../../models/plugins.js";
import type { ProductWarranty } from "../../models/Product.js";
import { ApiError } from "../../utils/ApiError.js";

// §3.5: the public verify endpoint hands back the evidence panel's
// contents, not the whole Product (price/stock/etc. aren't this
// endpoint's concern, and code-guessing shouldn't leak catalog data).
export interface AuthenticityVerification {
  productName: LocalizedName;
  productSlug: string;
  supplyRoute: string;
  sourceBrand: string;
  countryOfManufacture: string;
  hologramCode?: string;
  guideUrl?: string;
  warranty: ProductWarranty;
}

export async function verifyCode(code: string): Promise<AuthenticityVerification> {
  const product = await ProductModel.findOne({ "authenticity.verificationCode": code });
  if (!product) {
    throw new ApiError(404, "کد اصالت یافت نشد");
  }

  return {
    productName: product.name,
    productSlug: product.slug,
    supplyRoute: product.authenticity.supplyRoute,
    sourceBrand: product.authenticity.sourceBrand,
    countryOfManufacture: product.authenticity.countryOfManufacture,
    hologramCode: product.authenticity.hologramCode,
    guideUrl: product.authenticity.guideUrl,
    warranty: product.warranty,
  };
}
