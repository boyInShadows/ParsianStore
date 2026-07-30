import {
  estimateShippingResponseSchema,
  checkoutInitiateResponseSchema,
  type ShippingOptionDto,
  type CheckoutInitiateDto,
} from "schemas";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export type CheckoutActionResult<T> = { ok: true; data: T } | { ok: false; message: string };

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

export interface EstimateShippingResult {
  totalWeightGram: number;
  options: ShippingOptionDto[];
}

// requireAuth-gated (stacked on cartRouter for this one route, P6.S4) --
// same credentials:"include" reasoning as every other /me/* or auth-only
// fetcher in this codebase.
export async function estimateShipping(
  addressId: string,
): Promise<CheckoutActionResult<EstimateShippingResult>> {
  try {
    const res = await fetch(`${API_URL}/api/v1/cart/estimate-shipping`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ addressId }),
    });
    if (!res.ok) return { ok: false, message: await readErrorMessage(res) };
    const json = await res.json();
    const parsed = estimateShippingResponseSchema.safeParse(json);
    return parsed.success
      ? { ok: true, data: parsed.data.data }
      : { ok: false, message: GENERIC_ERROR };
  } catch {
    return { ok: false, message: GENERIC_ERROR };
  }
}

export async function initiateCheckout(input: {
  addressId: string;
  shippingMethodCode: string;
  notes?: string;
}): Promise<CheckoutActionResult<CheckoutInitiateDto>> {
  try {
    const res = await fetch(`${API_URL}/api/v1/checkout/initiate`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) return { ok: false, message: await readErrorMessage(res) };
    const json = await res.json();
    const parsed = checkoutInitiateResponseSchema.safeParse(json);
    return parsed.success
      ? { ok: true, data: parsed.data.data }
      : { ok: false, message: GENERIC_ERROR };
  } catch {
    return { ok: false, message: GENERIC_ERROR };
  }
}
