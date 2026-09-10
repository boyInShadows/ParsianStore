import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma.js";
import { ApiError } from "../../utils/ApiError.js";
import { localized } from "../../utils/serialize.js";
import type { AddressInput } from "./addresses.schema.js";

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

/**
 * An address is a table now, not an array embedded in the user document,
 * which is what makes this whole module shrink: "the caller's own address"
 * is a two-column `where` rather than a scan of `user.addresses`, and the
 * province and city arrive joined instead of through two batched lookups
 * and two Maps.
 *
 * The joins name `deletedAt` because the soft-delete extension does not
 * reach nested reads (config/prisma.ts), and geo rows are soft-deletable.
 */
const GEO = {
  province: { select: { id: true, nameFa: true, nameEn: true, slug: true, deletedAt: true } },
  city: { select: { id: true, nameFa: true, nameEn: true, slug: true, deletedAt: true } },
} as const;

type AddressRow = Prisma.AddressGetPayload<{ include: typeof GEO }>;

/** A province or city removed after an address referenced it drops the
 * address from the view rather than crashing it -- the same orphan-drop
 * convention wishlist.service.ts's listWishlist uses. */
function toView(row: AddressRow): AddressView | null {
  if (row.province.deletedAt !== null || row.city.deletedAt !== null) return null;
  return {
    id: row.id,
    province: {
      id: row.province.id,
      name: localized(row.province),
      slug: row.province.slug,
    },
    city: { id: row.city.id, name: localized(row.city), slug: row.city.slug },
    line: row.line,
    postalCode: row.postalCode,
    ...(row.plate ? { plate: row.plate } : {}),
    ...(row.unit ? { unit: row.unit } : {}),
    receiverName: row.receiverName,
    receiverPhone: row.receiverPhone,
  };
}

/** Confirms `cityId` genuinely belongs to `provinceId` before a write ever
 * happens. The foreign keys guarantee both exist; only this can say they
 * belong together, and a mismatched pair is a nonsense shipping address. */
async function assertCityInProvince(provinceId: string, cityId: string): Promise<void> {
  const city = await prisma.city.findUnique({
    where: { id: cityId },
    select: { provinceId: true },
  });
  if (!city || city.provinceId !== provinceId) {
    throw new ApiError(400, "شهر انتخاب‌شده متعلق به استان انتخاب‌شده نیست");
  }
}

/** "An address that belongs to this user", the one query shape every
 * owned-address operation needs. */
async function findOwnAddress(userId: string, addressId: string): Promise<AddressRow> {
  const address = await prisma.address.findFirst({
    where: { id: addressId, userId },
    include: GEO,
  });
  if (!address) {
    throw new ApiError(400, "آدرس یافت نشد یا متعلق به شما نیست");
  }
  return address;
}

/** Used by modules/shipping's estimate-shipping to resolve a zone from one
 * of the caller's own addresses. */
export async function getOwnAddressProvinceId(userId: string, addressId: string): Promise<string> {
  return (await findOwnAddress(userId, addressId)).provinceId;
}

/** Used by modules/checkout to snapshot the caller's chosen address into a
 * new Order -- the whole address, not just its province. */
export async function getOwnAddress(userId: string, addressId: string): Promise<AddressView> {
  const view = toView(await findOwnAddress(userId, addressId));
  if (!view) {
    throw new ApiError(400, "آدرس یافت نشد یا متعلق به شما نیست");
  }
  return view;
}

export async function listAddresses(userId: string): Promise<AddressView[]> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) {
    throw new ApiError(404, "کاربر یافت نشد");
  }
  const rows = await prisma.address.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: GEO,
  });
  return rows.flatMap((row) => {
    const view = toView(row);
    return view ? [view] : [];
  });
}

export async function createAddress(userId: string, input: AddressInput): Promise<AddressView> {
  await assertCityInProvince(input.provinceId, input.cityId);
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) {
    throw new ApiError(404, "کاربر یافت نشد");
  }
  const created = await prisma.address.create({
    data: { userId, ...input },
    include: GEO,
  });
  return toView(created)!;
}

export async function updateAddress(
  userId: string,
  addressId: string,
  input: AddressInput,
): Promise<AddressView> {
  await assertCityInProvince(input.provinceId, input.cityId);
  const existing = await prisma.address.findFirst({
    where: { id: addressId, userId },
    select: { id: true },
  });
  if (!existing) {
    throw new ApiError(404, "آدرس یافت نشد");
  }
  const updated = await prisma.address.update({
    where: { id: addressId },
    data: input,
    include: GEO,
  });
  return toView(updated)!;
}

/**
 * Not idempotent, unlike Wishlist's DELETE -- an address id is the only
 * handle a client has to a specific row, so acting on one that does not
 * exist is a real client error worth surfacing, not a silent no-op the way
 * "unsave a product that was never saved" is.
 *
 * `deleteMany` scoped to the owner, and its count is the signal. The Mongo
 * version needed a paragraph here because `$pull` reported `modifiedCount: 1`
 * even when it matched no array element; a row either deletes or it does not.
 */
export async function deleteAddress(userId: string, addressId: string): Promise<void> {
  const { count } = await prisma.address.deleteMany({ where: { id: addressId, userId } });
  if (count === 0) {
    throw new ApiError(404, "آدرس یافت نشد");
  }
}
