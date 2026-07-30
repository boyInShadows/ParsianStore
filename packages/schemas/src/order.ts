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
