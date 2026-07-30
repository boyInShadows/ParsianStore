import { paymentCallbackResponseSchema, type PaymentCallbackDto } from "schemas";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export type PaymentActionResult<T> = { ok: true; data: T } | { ok: false; message: string };

const GENERIC_ERROR = "خطایی رخ داد، دوباره تلاش کنید";

async function readErrorMessage(res: Response): Promise<string> {
  try {
    const json = (await res.json()) as { error?: { message?: string } };
    if (typeof json.error?.message === "string") return json.error.message;
  } catch {
    // fall through to the generic message
  }
  return GENERIC_ERROR;
}

// No credentials needed -- GET /payments/callback has no auth (P6.S5's
// own design: the Authority token is the real trust boundary, matched
// against the specific Payment row it was issued for, not a session
// cookie). The gateway redirects the browser to this app's own
// /checkout/result page (P6.S6's buildPaymentResultUrl), which calls
// this exactly once on mount to actually finalize the payment.
export async function confirmPayment(params: {
  orderId: string;
  authority: string;
  status: "OK" | "NOK";
}): Promise<PaymentActionResult<PaymentCallbackDto>> {
  try {
    const query = new URLSearchParams({
      orderId: params.orderId,
      Authority: params.authority,
      Status: params.status,
    });
    const res = await fetch(`${API_URL}/api/v1/payments/callback?${query.toString()}`);
    if (!res.ok) return { ok: false, message: await readErrorMessage(res) };
    const json = await res.json();
    const parsed = paymentCallbackResponseSchema.safeParse(json);
    return parsed.success
      ? { ok: true, data: parsed.data.data }
      : { ok: false, message: GENERIC_ERROR };
  } catch {
    return { ok: false, message: GENERIC_ERROR };
  }
}
