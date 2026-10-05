import { paymentCallbackResponseSchema, type PaymentCallbackDto } from "schemas";
import { API_URL, apiAction, type ActionResult } from "@/lib/api-fetch";

export type PaymentActionResult<T> = ActionResult<T>;

// No credentials needed -- GET /payments/callback has no auth (P6.S5's
// own design: the Authority token is the real trust boundary, matched
// against the specific Payment row it was issued for, not a session
// cookie). The gateway redirects the browser to this app's own
// /checkout/result page (P6.S6's buildPaymentResultUrl), which calls
// this exactly once on mount to actually finalize the payment.
export function confirmPayment(params: {
  orderId: string;
  authority: string;
  status: "OK" | "NOK";
}): Promise<PaymentActionResult<PaymentCallbackDto>> {
  const query = new URLSearchParams({
    orderId: params.orderId,
    Authority: params.authority,
    Status: params.status,
  });
  return apiAction(
    `${API_URL}/api/v1/payments/callback?${query.toString()}`,
    paymentCallbackResponseSchema,
  );
}
