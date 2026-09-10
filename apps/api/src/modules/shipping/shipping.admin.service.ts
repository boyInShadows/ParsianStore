import type { ShippingRate } from "@prisma/client";
import { SHIPPING_METHODS, type AdminShippingRateDto } from "schemas";
import { ANY_STATE, prisma, softDeleteData, stateFilter } from "../../config/prisma.js";
import { ApiError } from "../../utils/ApiError.js";
import {
  paginate,
  type PaginationMeta,
  type PaginationQuery,
  type Where,
} from "../../utils/pagination.js";
import type {
  AdminShippingRateListQuery,
  CreateShippingRateInput,
  UpdateShippingRateInput,
} from "./shipping.admin.schema.js";

const NOT_FOUND = "نرخ ارسال یافت نشد";

type ListFilters = Omit<AdminShippingRateListQuery, keyof PaginationQuery>;

function buildListFilter(filters: ListFilters): Where {
  return {
    ...stateFilter(filters.state),
    ...(filters.methodCode ? { methodCode: filters.methodCode } : {}),
    ...(filters.zone ? { zone: filters.zone } : {}),
  };
}

function toDto(rate: ShippingRate): AdminShippingRateDto {
  const method = SHIPPING_METHODS.find((entry) => entry.code === rate.methodCode);
  return {
    id: rate.id,
    methodCode: rate.methodCode,
    // A rate row whose courier code is no longer in SHIPPING_METHODS still
    // has to render -- falling back to the raw code beats an empty label
    // that hides which row is stale.
    methodName: method
      ? { fa: method.name.fa, en: method.name.en }
      : { fa: rate.methodCode, en: rate.methodCode },
    zone: rate.zone,
    minWeightGram: rate.minWeightGram,
    maxWeightGram: rate.maxWeightGram,
    priceRial: rate.priceRial,
    deletedAt: rate.deletedAt ? rate.deletedAt.toISOString() : null,
  };
}

/**
 * estimateShipping picks the first bracket whose weight range contains the
 * cart, so two brackets covering the same weights for one method+zone make
 * the price charged depend on which row is looked at first. Rejecting that
 * at write time is the only place it can be caught -- by checkout it is
 * already a wrong number on a real order.
 *
 * Sharing a single endpoint is NOT treated as an overlap. "۰ تا ۱۰۰۰" then
 * "۱۰۰۰ تا ۲۰۰۰" is how these ladders are conventionally written and how
 * the shipped seed (seed/shipping.ts) already reads; a strict rule would
 * make every existing row un-editable the day this screen shipped. The
 * one gram they share resolves deterministically to the lower bracket --
 * shipping.service.ts sorts brackets ascending before matching precisely
 * so that is a guarantee and not an accident of insertion order.
 *
 * `null` max means open-ended, compared as +Infinity.
 *
 * The schema's `@@unique([methodCode, zone, minWeightGram])` catches only the
 * exact-duplicate case; a band that starts elsewhere and overlaps is still
 * this function's job.
 */
async function assertNoOverlap(input: CreateShippingRateInput, excludeId?: string): Promise<void> {
  const siblings = await prisma.shippingRate.findMany({
    where: {
      methodCode: input.methodCode,
      zone: input.zone,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });

  const newMax = input.maxWeightGram ?? Number.POSITIVE_INFINITY;
  const clash = siblings.find((rate) => {
    const existingMax = rate.maxWeightGram ?? Number.POSITIVE_INFINITY;
    return input.minWeightGram < existingMax && rate.minWeightGram < newMax;
  });

  if (clash) {
    const upper = clash.maxWeightGram === null ? "بی‌نهایت" : String(clash.maxWeightGram);
    throw new ApiError(
      409,
      `این بازه وزنی با بازه موجود ${clash.minWeightGram} تا ${upper} گرم هم‌پوشانی دارد`,
    );
  }
}

export async function listAdminShippingRates(
  pagination: PaginationQuery,
  filters: ListFilters,
): Promise<{ data: AdminShippingRateDto[]; meta: PaginationMeta }> {
  const { data, meta } = await paginate<ShippingRate>(
    prisma.shippingRate,
    "ShippingRate",
    buildListFilter(filters),
    {
      ...pagination,
      // Grouped the way staff read the table: courier, then zone, then the
      // weight ladder in order.
      sort: pagination.sort ?? "methodCode zone minWeightGram",
    },
  );
  return { data: data.map(toDto), meta };
}

/** Finds regardless of soft-delete state, so edit/restore can reach a deleted row. */
async function findAnyById(id: string): Promise<ShippingRate> {
  const rate = await prisma.shippingRate.findFirst({ where: { id, ...ANY_STATE } });
  if (!rate) throw new ApiError(404, NOT_FOUND);
  return rate;
}

export async function getAdminShippingRateById(id: string): Promise<AdminShippingRateDto> {
  return toDto(await findAnyById(id));
}

export async function createShippingRate(
  input: CreateShippingRateInput,
): Promise<AdminShippingRateDto> {
  await assertNoOverlap(input);
  return toDto(await prisma.shippingRate.create({ data: input }));
}

export async function updateShippingRate(
  id: string,
  input: UpdateShippingRateInput,
): Promise<AdminShippingRateDto> {
  const rate = await prisma.shippingRate.findUnique({ where: { id } });
  if (!rate) throw new ApiError(404, NOT_FOUND);
  await assertNoOverlap(input, id);
  return toDto(await prisma.shippingRate.update({ where: { id }, data: input }));
}

/**
 * No usage guard like the catalog entities have: a rate is never
 * referenced by another row (an order snapshots the resolved price, per
 * Order's shipping-method columns), so deleting one can orphan nothing.
 * What it CAN do is leave a weight range with no bracket at all, which
 * estimateShipping reports as "this method is unavailable" -- correct
 * behaviour, and visible in the list, so it is not blocked here.
 */
export async function deleteShippingRate(id: string): Promise<void> {
  const rate = await prisma.shippingRate.findUnique({ where: { id } });
  if (!rate) throw new ApiError(404, NOT_FOUND);
  await prisma.shippingRate.update({ where: { id }, data: softDeleteData() });
}

export async function restoreShippingRate(id: string): Promise<AdminShippingRateDto> {
  const rate = await findAnyById(id);
  // Restoring into a range another bracket has since taken over would
  // reintroduce exactly the ambiguity assertNoOverlap exists to prevent.
  await assertNoOverlap(
    {
      methodCode: rate.methodCode,
      zone: rate.zone,
      minWeightGram: rate.minWeightGram,
      maxWeightGram: rate.maxWeightGram,
      priceRial: rate.priceRial,
    },
    id,
  );
  const restored = await prisma.shippingRate.update({
    where: { id, ...ANY_STATE },
    data: { deletedAt: null },
  });
  return toDto(restored);
}
