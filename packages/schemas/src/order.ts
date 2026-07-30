import { z } from "zod";

// Mirrors apps/api's POST /checkout/initiate and GET /payments/callback
// (P6.S5) -- same "apps/api has no Zod schema for its own responses"
// reasoning as every other module in this package. This step is backend-
// only (no apps/web /checkout page yet, same "backend infra ahead of its
// UI consumer" pattern as P6.S2/P6.S3/P6.S4) -- these two response
// shapes are deliberately minimal, just what the real checkout UI step
// will need to redirect the browser and then show a result. A full
// order-detail DTO (with the real OrderStatus enum) belongs with
// whichever future Phase 7 step builds "my orders" -- not guessed at here.

// P7.S1: the real OrderStatus enum, deferred here at P6.S5 kickoff until
// a real order-detail UI existed to justify it -- mirrors apps/api's
// Order.ts ORDER_STATUSES exactly.
export const orderStatusSchema = z.enum([
  "pending",
  "paid",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
]);
export type OrderStatusDto = z.infer<typeof orderStatusSchema>;

export const checkoutInitiateResponseSchema = z.object({
  ok: z.literal(true),
  data: z.object({
    orderId: z.string(),
    orderCode: z.string(),
    redirectUrl: z.string(),
  }),
});
export type CheckoutInitiateDto = z.infer<typeof checkoutInitiateResponseSchema>["data"];

export const paymentCallbackResponseSchema = z.object({
  ok: z.literal(true),
  data: z.object({
    orderCode: z.string(),
    status: z.string(),
  }),
});
export type PaymentCallbackDto = z.infer<typeof paymentCallbackResponseSchema>["data"];

// P7.S1: mirrors apps/api's GET /me/orders and GET /me/orders/:code.
const localizedNameSchema = z.object({ fa: z.string(), en: z.string() });

// The list row is deliberately lighter than the detail (no items/
// address/shippingMethod/statusHistory) -- a list page only needs enough
// to identify and triage an order, matching how every other list
// endpoint in this codebase (products, addresses) hydrates a lighter
// shape than its own detail view.
export const orderSummarySchema = z.object({
  id: z.string(),
  code: z.string(),
  status: orderStatusSchema,
  itemCount: z.number(),
  totalRial: z.number(),
  createdAt: z.string(),
});
export type OrderSummaryDto = z.infer<typeof orderSummarySchema>;

const orderItemDetailSchema = z.object({
  productId: z.string(),
  nameSnapshot: localizedNameSchema,
  skuSnapshot: z.string(),
  qty: z.number(),
  priceRial: z.number(),
});

const orderStatusEntrySchema = z.object({
  status: orderStatusSchema,
  at: z.string(),
  note: z.string().optional(),
});

const orderAddressSnapshotSchema = z.object({
  province: localizedNameSchema,
  city: localizedNameSchema,
  line: z.string(),
  postalCode: z.string(),
  plate: z.string().optional(),
  unit: z.string().optional(),
  receiverName: z.string(),
  receiverPhone: z.string(),
});

const orderShippingMethodSnapshotSchema = z.object({
  code: z.string(),
  name: localizedNameSchema,
  priceRial: z.number(),
});

export const orderDetailSchema = z.object({
  id: z.string(),
  code: z.string(),
  status: orderStatusSchema,
  items: z.array(orderItemDetailSchema),
  subtotalRial: z.number(),
  discountRial: z.number(),
  couponCode: z.string().optional(),
  shippingRial: z.number(),
  taxRial: z.number(),
  totalRial: z.number(),
  address: orderAddressSnapshotSchema,
  shippingMethod: orderShippingMethodSnapshotSchema,
  trackingCode: z.string().optional(),
  statusHistory: z.array(orderStatusEntrySchema),
  notes: z.string().optional(),
  createdAt: z.string(),
});
export type OrderDetailDto = z.infer<typeof orderDetailSchema>;

// Exported (not module-private) so admin-order.ts can build its own
// list-response envelopes against the identical {total,page,limit} shape
// without redefining it.
export const paginationMetaSchema = z.object({
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});

export const orderListResponseSchema = z.object({
  ok: z.literal(true),
  data: z.array(orderSummarySchema),
  meta: paginationMetaSchema,
});

export const orderDetailResponseSchema = z.object({
  ok: z.literal(true),
  data: orderDetailSchema,
});
