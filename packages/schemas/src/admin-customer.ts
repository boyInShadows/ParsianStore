import { z } from "zod";

// P8.S3: admin-only customer lookup + account-type flag. Own file for
// the same bundle-budget reason as admin-coupon.ts/admin-product.ts.
// Deliberately minimal -- this exists to replace the
// `pnpm set-account-type <phone> <retail|wholesale>` script, not to be
// the full customers list/detail surface (its own later Phase 8 item,
// which extends this rather than replacing it).

export const ACCOUNT_TYPES = ["retail", "wholesale"] as const;
export const accountTypeSchema = z.enum(ACCOUNT_TYPES);
export type AccountTypeDto = z.infer<typeof accountTypeSchema>;

export const adminCustomerSchema = z.object({
  id: z.string(),
  phone: z.string(),
  name: z.string().optional(),
  role: z.string(),
  accountType: accountTypeSchema,
  createdAt: z.string(),
});
export type AdminCustomerDto = z.infer<typeof adminCustomerSchema>;

export const adminSetAccountTypeInputSchema = z.object({
  accountType: accountTypeSchema,
});
export type AdminSetAccountTypeInput = z.infer<typeof adminSetAccountTypeInputSchema>;

// P8.S7: the detail half of the customers surface the P8.S3 note above
// said would extend this file rather than replace it.

const adminCustomerAddressSchema = z.object({
  id: z.string(),
  // Resolved display names, not the stored provinceId/cityId -- staff read
  // "تهران / تهران", and making the browser do a second geo lookup per
  // address would be a request waterfall for nothing.
  province: z.string(),
  city: z.string(),
  line: z.string(),
  postalCode: z.string(),
  plate: z.string().optional(),
  unit: z.string().optional(),
  receiverName: z.string(),
  receiverPhone: z.string(),
});

const adminCustomerVehicleSchema = z.object({
  id: z.string(),
  make: z.string(),
  model: z.string(),
  generation: z.string(),
  year: z.number(),
  nickname: z.string().optional(),
});

const adminCustomerOrderSchema = z.object({
  id: z.string(),
  code: z.string(),
  status: z.string(),
  totalRial: z.number(),
  createdAt: z.string(),
});

export const adminCustomerDetailViewSchema = adminCustomerSchema.extend({
  email: z.string().optional(),
  isActive: z.boolean(),
  lastLoginAt: z.string().nullable(),
  walletBalanceRial: z.number(),
  stats: z.object({
    // Paid-through-delivered only, matching the dashboard's own definition
    // of revenue -- a customer's "value" must not count orders they never
    // paid for or had refunded.
    orderCount: z.number(),
    lifetimeValueRial: z.number(),
    averageOrderRial: z.number(),
    lastOrderAt: z.string().nullable(),
    openOrderCount: z.number(),
  }),
  addresses: z.array(adminCustomerAddressSchema),
  garage: z.array(adminCustomerVehicleSchema),
  recentOrders: z.array(adminCustomerOrderSchema),
});
export type AdminCustomerDetailDto = z.infer<typeof adminCustomerDetailViewSchema>;

export const adminCustomerDetailViewResponseSchema = z.object({
  ok: z.literal(true),
  data: adminCustomerDetailViewSchema,
});

const paginationMetaSchema = z.object({
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});

export const adminCustomerListResponseSchema = z.object({
  ok: z.literal(true),
  data: z.array(adminCustomerSchema),
  meta: paginationMetaSchema,
});

export const adminCustomerDetailResponseSchema = z.object({
  ok: z.literal(true),
  data: adminCustomerSchema,
});
