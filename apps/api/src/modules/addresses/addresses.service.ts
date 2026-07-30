import { Types } from "mongoose";
import { CityModel } from "../../models/City.js";
import { ProvinceModel } from "../../models/Province.js";
import { UserModel, type Address } from "../../models/User.js";
import { ApiError } from "../../utils/ApiError.js";
import type { AddressInput } from "./addresses.schema.js";

// AddressInput's provinceId/cityId are Zod-validated ObjectId-shaped
// strings (route input); the Mongoose Address schema wants real
// Types.ObjectId values, same conversion cart.service.ts's addItem
// already does with a fetched Product's _id.
function toAddressDoc(input: AddressInput): Omit<Address, "_id"> {
  return {
    ...input,
    provinceId: new Types.ObjectId(input.provinceId),
    cityId: new Types.ObjectId(input.cityId),
  };
}

export interface AddressView {
  id: string;
  province: { id: string; name: { fa: string; en: string }; slug: string };
  city: { id: string; name: { fa: string; en: string }; slug: string };
  line: string;
  postalCode: string;
  plate?: string;
  unit?: string;
  receiverName: string;
  receiverPhone: string;
}

/** Confirms `cityId` genuinely belongs to `provinceId` before a write ever
 * happens -- an ObjectId-shape check alone would silently accept a
 * mismatched pair and produce a nonsense shipping address. Returns the
 * City doc (callers that already need it avoid a second lookup). */
async function assertCityInProvince(provinceId: string, cityId: string) {
  const city = await CityModel.findById(cityId);
  if (!city || city.provinceId.toString() !== provinceId) {
    throw new ApiError(400, "شهر انتخاب‌شده متعلق به استان انتخاب‌شده نیست");
  }
  return city;
}

/** Separate-query hydration, not `.populate()` -- the established
 * convention across this codebase (products.service.ts, cart.service.ts,
 * wishlist.service.ts). Batches every referenced Province/City in the
 * list into two queries total, regardless of how many addresses exist. */
async function hydrateAddresses(addresses: Address[]): Promise<AddressView[]> {
  if (addresses.length === 0) return [];

  const provinceIds = [...new Set(addresses.map((a) => a.provinceId.toString()))];
  const cityIds = [...new Set(addresses.map((a) => a.cityId.toString()))];
  const [provinces, cities] = await Promise.all([
    ProvinceModel.find({ _id: { $in: provinceIds } }),
    CityModel.find({ _id: { $in: cityIds } }),
  ]);
  const provinceById = new Map(provinces.map((p) => [p.id as string, p]));
  const cityById = new Map(cities.map((c) => [c.id as string, c]));

  // A province/city removed after an address referenced it (shouldn't
  // happen in practice -- no admin CRUD for geo data exists yet) drops
  // the address from the view rather than crash, same orphan-drop
  // convention wishlist.service.ts's listWishlist already uses.
  return addresses.flatMap((address): AddressView[] => {
    const province = provinceById.get(address.provinceId.toString());
    const city = cityById.get(address.cityId.toString());
    if (!province || !city) return [];
    return [
      {
        id: address._id!.toString(),
        province: { id: province.id as string, name: province.name, slug: province.slug },
        city: { id: city.id as string, name: city.name, slug: city.slug },
        line: address.line,
        postalCode: address.postalCode,
        plate: address.plate,
        unit: address.unit,
        receiverName: address.receiverName,
        receiverPhone: address.receiverPhone,
      },
    ];
  });
}

/** Used by modules/shipping's estimate-shipping to resolve a zone from
 * one of the caller's own addresses, without duplicating the "find an
 * address that belongs to this user" query shape update/deleteAddress
 * already have. Throws the same 404 an owned-resource lookup would. */
export async function getOwnAddressProvinceId(
  userId: string,
  addressId: string,
): Promise<Types.ObjectId> {
  const user = await UserModel.findById(userId);
  const address = user?.addresses.find((a) => a._id!.toString() === addressId);
  if (!address) {
    throw new ApiError(400, "آدرس یافت نشد یا متعلق به شما نیست");
  }
  return address.provinceId;
}

export async function listAddresses(userId: string): Promise<AddressView[]> {
  const user = await UserModel.findById(userId);
  if (!user) {
    throw new ApiError(404, "کاربر یافت نشد");
  }
  return hydrateAddresses(user.addresses);
}

export async function createAddress(userId: string, input: AddressInput): Promise<AddressView> {
  await assertCityInProvince(input.provinceId, input.cityId);

  const user = await UserModel.findByIdAndUpdate(
    userId,
    { $push: { addresses: toAddressDoc(input) } },
    { new: true },
  );
  if (!user) {
    throw new ApiError(404, "کاربر یافت نشد");
  }
  const created = user.addresses[user.addresses.length - 1]!;
  const [view] = await hydrateAddresses([created]);
  return view!;
}

export async function updateAddress(
  userId: string,
  addressId: string,
  input: AddressInput,
): Promise<AddressView> {
  await assertCityInProvince(input.provinceId, input.cityId);

  // Whole-subdocument replace via the positional operator, preserving the
  // existing _id -- simpler and less error-prone than setting each field
  // individually.
  const result = await UserModel.updateOne(
    { _id: userId, "addresses._id": addressId },
    { $set: { "addresses.$": { _id: new Types.ObjectId(addressId), ...toAddressDoc(input) } } },
  );
  if (result.matchedCount === 0) {
    throw new ApiError(404, "آدرس یافت نشد");
  }

  const user = await UserModel.findById(userId);
  const updated = user!.addresses.find((a) => a._id!.toString() === addressId)!;
  const [view] = await hydrateAddresses([updated]);
  return view!;
}

/** Not idempotent, unlike Wishlist's DELETE -- an address's `_id` is the
 * only handle a client has to a specific row, so acting on one that
 * doesn't exist is a real client error worth surfacing, not a silent
 * no-op the way "unsave a product that was never saved" is. */
export async function deleteAddress(userId: string, addressId: string): Promise<void> {
  // Real MongoDB behavior worth remembering: `$pull` reports
  // `modifiedCount: 1` even when it matches zero array elements (the
  // array path is still "touched"), so `modifiedCount` can't tell success
  // from a no-op here -- confirmed empirically, not assumed. The query
  // FILTER itself must require "addresses._id": addressId (same pattern
  // updateAddress already uses) so `matchedCount` is the reliable signal:
  // the user document only matches at all if that address currently
  // exists.
  const result = await UserModel.updateOne(
    { _id: userId, "addresses._id": addressId },
    { $pull: { addresses: { _id: addressId } } },
  );
  if (result.matchedCount === 0) {
    throw new ApiError(404, "آدرس یافت نشد");
  }
}
