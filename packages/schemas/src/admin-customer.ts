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
