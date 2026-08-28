import type { LocalizedName } from "schemas";
import { prisma } from "../../config/prisma.js";
import { ApiError } from "../../utils/ApiError.js";
import { localized, supplyRouteToWire } from "../../utils/serialize.js";

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
  warranty: { months: number; text: string };
}

export async function verifyCode(code: string): Promise<AuthenticityVerification> {
  // The authenticity record is columns on Product now rather than an embedded
  // document, so this is a plain equality filter instead of a dotted path --
  // and `verificationCode` is a real column the planner can use.
  const product = await prisma.product.findFirst({
    where: { verificationCode: code },
    select: {
      nameFa: true,
      nameEn: true,
      slug: true,
      supplyRoute: true,
      sourceBrand: true,
      countryOfManufacture: true,
      hologramCode: true,
      guideUrl: true,
      warrantyMonths: true,
      warrantyText: true,
    },
  });
  if (!product) {
    throw new ApiError(404, "کد اصالت یافت نشد");
  }

  return {
    productName: localized(product),
    productSlug: product.slug,
    supplyRoute: supplyRouteToWire(product.supplyRoute),
    sourceBrand: product.sourceBrand,
    countryOfManufacture: product.countryOfManufacture,
    ...(product.hologramCode ? { hologramCode: product.hologramCode } : {}),
    ...(product.guideUrl ? { guideUrl: product.guideUrl } : {}),
    warranty: { months: product.warrantyMonths, text: product.warrantyText },
  };
}
