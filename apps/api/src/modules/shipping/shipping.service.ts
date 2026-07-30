import { SHIPPING_METHODS, type ShippingOptionDto, type ShippingZone } from "schemas";
import { ProductModel } from "../../models/Product.js";
import { ProvinceModel } from "../../models/Province.js";
import { ShippingRateModel } from "../../models/ShippingRate.js";
import { ApiError } from "../../utils/ApiError.js";
import * as addressesService from "../addresses/addresses.service.js";
import * as cartService from "../cart/cart.service.js";
import type { AccountType } from "../../models/User.js";

export interface ShippingEstimate {
  totalWeightGram: number;
  options: ShippingOptionDto[];
}

/** §3.6: "پست پیشتاز · تیپاکس · چاپار · پیک درون‌شهری · حضوری. Zone +
 * weight based." Zone is resolved from the province slug -- only Tehran
 * is actually distinct in real Iranian courier pricing, so this is a
 * plain check, not a new Province.zone field (P6.S4's own design note). */
function resolveZone(provinceSlug: string): ShippingZone {
  return provinceSlug === "tehran" ? "tehran" : "other";
}

export async function estimateShipping(
  userId: string,
  addressId: string,
  accountType: AccountType | undefined,
): Promise<ShippingEstimate> {
  const provinceId = await addressesService.getOwnAddressProvinceId(userId, addressId);
  const province = await ProvinceModel.findById(provinceId);
  if (!province) {
    throw new ApiError(400, "استان آدرس یافت نشد");
  }
  const zone = resolveZone(province.slug);

  const cart = await cartService.getCart({ userId }, accountType);
  if (cart.items.length === 0) {
    throw new ApiError(400, "سبد خرید خالی است");
  }

  // Separate query, not `.populate()` -- `weightGram` isn't part of
  // Cart's own public product DTO (productListItemSchema), and doesn't
  // need to become part of it just for this internal calculation.
  const productIds = cart.items.map((item) => item.productId);
  const products = await ProductModel.find({ _id: { $in: productIds } }, "weightGram");
  const weightById = new Map(products.map((p) => [p._id.toString(), p.weightGram]));
  const totalWeightGram = cart.items.reduce(
    (sum, item) => sum + (weightById.get(item.productId) ?? 0) * item.qty,
    0,
  );

  // One query for every rate row in this zone, then in-memory bracket
  // matching per method -- avoids an N+1 query per SHIPPING_METHODS entry.
  const rates = await ShippingRateModel.find({ zone });

  const options: ShippingOptionDto[] = [];
  for (const method of SHIPPING_METHODS) {
    // `SHIPPING_METHODS`'s `as const satisfies` narrows each entry's own
    // `zones` tuple to its exact literal values (e.g. `readonly
    // ["tehran"]` for intracity) rather than the general `ShippingZone[]`
    // the interface declares -- a real TS quirk, not a design choice.
    const zones = method.zones as readonly ShippingZone[];
    if (!zones.includes(zone)) continue;
    const bracket = rates
      .filter((rate) => rate.methodCode === method.code)
      .find(
        (rate) =>
          rate.minWeightGram <= totalWeightGram &&
          (rate.maxWeightGram === null || rate.maxWeightGram >= totalWeightGram),
      );
    if (bracket) {
      options.push({ methodCode: method.code, name: method.name, priceRial: bracket.priceRial });
    }
  }

  return { totalWeightGram, options };
}
