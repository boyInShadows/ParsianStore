import type { FilterQuery, HydratedDocument } from "mongoose";
import { SHIPPING_METHODS, type AdminShippingRateDto } from "schemas";
import { ShippingRateModel, type ShippingRate } from "../../models/ShippingRate.js";
import { ApiError } from "../../utils/ApiError.js";
import { paginate, type PaginationMeta, type PaginationQuery } from "../../utils/pagination.js";
import type {
  AdminShippingRateListQuery,
  CreateShippingRateInput,
  UpdateShippingRateInput,
} from "./shipping.admin.schema.js";

const NOT_FOUND = "نرخ ارسال یافت نشد";

/** See categories.admin.service.ts for why this shape, not `$in: [null, ...]`. */
const ANY_STATE = { deletedAt: { $exists: true } } as const;

type ListFilters = Omit<AdminShippingRateListQuery, keyof PaginationQuery>;

function buildListFilter(filters: ListFilters): FilterQuery<ShippingRate> {
  const filter: FilterQuery<ShippingRate> =
    filters.state === "deleted" ? { deletedAt: { $ne: null } } : { deletedAt: null };
  if (filters.methodCode) filter.methodCode = filters.methodCode;
  if (filters.zone) filter.zone = filters.zone;
  return filter;
}

function toDto(doc: HydratedDocument<ShippingRate>): AdminShippingRateDto {
  const method = SHIPPING_METHODS.find((entry) => entry.code === doc.methodCode);
  return {
    id: String(doc._id),
    methodCode: doc.methodCode,
    // A rate row whose courier code is no longer in SHIPPING_METHODS still
    // has to render -- falling back to the raw code beats an empty label
    // that hides which row is stale.
    methodName: method
      ? { fa: method.name.fa, en: method.name.en }
      : {
          fa: doc.methodCode,
          en: doc.methodCode,
        },
    zone: doc.zone,
    minWeightGram: doc.minWeightGram,
    maxWeightGram: doc.maxWeightGram,
    priceRial: doc.priceRial,
    deletedAt: doc.deletedAt ? doc.deletedAt.toISOString() : null,
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
 */
async function assertNoOverlap(input: CreateShippingRateInput, excludeId?: string): Promise<void> {
  const siblings = await ShippingRateModel.find({
    methodCode: input.methodCode,
    zone: input.zone,
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
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
  const { data, meta } = await paginate(ShippingRateModel, buildListFilter(filters), {
    ...pagination,
    // Grouped the way staff read the table: courier, then zone, then the
    // weight ladder in order.
    sort: pagination.sort ?? "methodCode zone minWeightGram",
  });
  return { data: data.map(toDto), meta };
}

/** Finds regardless of soft-delete state, so edit/restore can reach a deleted row. */
async function findAnyById(id: string): Promise<HydratedDocument<ShippingRate>> {
  const rate = await ShippingRateModel.findOne({ _id: id, ...ANY_STATE });
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
  return toDto(await ShippingRateModel.create(input));
}

export async function updateShippingRate(
  id: string,
  input: UpdateShippingRateInput,
): Promise<AdminShippingRateDto> {
  const rate = await ShippingRateModel.findById(id);
  if (!rate) throw new ApiError(404, NOT_FOUND);
  await assertNoOverlap(input, id);
  Object.assign(rate, input);
  await rate.save();
  return toDto(rate);
}

/**
 * No usage guard like the catalog entities have: a rate is never
 * referenced by another document (an order snapshots the resolved price,
 * per Order.shippingMethod), so deleting one can orphan nothing. What it
 * CAN do is leave a weight range with no bracket at all, which
 * estimateShipping reports as "this method is unavailable" -- correct
 * behaviour, and visible in the list, so it is not blocked here.
 */
export async function deleteShippingRate(id: string): Promise<void> {
  const rate = await ShippingRateModel.findById(id);
  if (!rate) throw new ApiError(404, NOT_FOUND);
  await rate.softDelete();
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
  rate.deletedAt = null;
  await rate.save();
  return toDto(rate);
}
