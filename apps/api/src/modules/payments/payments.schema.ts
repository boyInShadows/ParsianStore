import { z } from "zod";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "شناسه معتبر نیست");

// Zarinpal's own real callback query shape is `Authority`/`Status`
// (capitalized, not this codebase's usual camelCase) -- kept verbatim
// since it's an external contract, not our naming convention. `orderId`
// is this codebase's own addition, embedded into the callbackUrl at
// initiate time (checkout.service.ts) so the callback can find the right
// Order/Payment pair without depending on Authority alone being globally
// unique across providers/environments.
export const paymentCallbackQuerySchema = z.object({
  orderId: objectId,
  Authority: z.string().min(1),
  Status: z.enum(["OK", "NOK"]),
});
export type PaymentCallbackQuery = z.infer<typeof paymentCallbackQuerySchema>;
