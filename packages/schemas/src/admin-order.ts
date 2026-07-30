import { z } from "zod";
import {
  orderDetailSchema,
  orderStatusSchema,
  orderSummarySchema,
  paginationMetaSchema,
} from "./order.js";

// P8.S1: admin equivalents of order.ts's own list/detail shapes, for
// staff order management (not customer-scoped -- lists/reads across
// every user). Deliberately a SEPARATE file from order.ts, not just
// appended to it: every shop route imports something from order.ts
// (formatToman/orderStatusSchema/etc. are pulled in transitively via
// the same module), and this package has no compiled build step
// (consumed as TS source directly, per §4) -- so Next.js's bundler
// tree-shakes at the FILE level, not per-export. Admin-only schemas
// living inside order.ts would have shipped extra bytes to every single
// shop route regardless of whether that route ever touches an admin
// concept -- confirmed by measuring the real production build before
// and after this split (every shop route's First Load JS grew ~11KB
// uniformly with the schemas inline in order.ts, landing pushed over its
// own 180KB §10 budget; both regressions disappeared once split out
// here). Same barrel-import-cost lesson §17 already documents for
// components/motion (P4.S5), just for a shared schemas package instead
// of a component barrel.

// `customerPhone` is the one field the customer-facing shapes never
// needed (a shopper always already knows who they are); resolved
// server-side via a separate User lookup, never a live populate, same
// pattern every other hydration in this codebase already uses.
export const adminOrderSummarySchema = orderSummarySchema.extend({
  userId: z.string(),
  customerPhone: z.string(),
});
export type AdminOrderSummaryDto = z.infer<typeof adminOrderSummarySchema>;

export const adminOrderDetailSchema = orderDetailSchema.extend({
  userId: z.string(),
  customerPhone: z.string(),
});
export type AdminOrderDetailDto = z.infer<typeof adminOrderDetailSchema>;

export const adminOrderListResponseSchema = z.object({
  ok: z.literal(true),
  data: z.array(adminOrderSummarySchema),
  meta: paginationMetaSchema,
});

export const adminOrderDetailResponseSchema = z.object({
  ok: z.literal(true),
  data: adminOrderDetailSchema,
});

// Refunds/invoices stay out of scope for this first admin piece (no
// PaymentProvider.refund() exists yet) -- this is a plain manual status
// transition, no rule enforced server-side on which statuses can follow
// which (staff judgment, same as every other admin write in this app
// having no workflow engine).
export const updateOrderStatusInputSchema = z.object({
  status: orderStatusSchema,
  note: z.string().trim().min(1).optional(),
});
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusInputSchema>;
