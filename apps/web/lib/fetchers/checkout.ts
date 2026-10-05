import {
  estimateShippingResponseSchema,
  checkoutInitiateResponseSchema,
  type ShippingOptionDto,
  type CheckoutInitiateDto,
} from "schemas";
import { API_URL, apiAction, jsonBody, type ActionResult } from "@/lib/api-fetch";

export type CheckoutActionResult<T> = ActionResult<T>;

export interface EstimateShippingResult {
  totalWeightGram: number;
  options: ShippingOptionDto[];
}

// requireAuth-gated (stacked on cartRouter for this one route, P6.S4) --
// same credentials:"include" reasoning as every other /me/* or auth-only
// fetcher in this codebase.
export function estimateShipping(
  addressId: string,
): Promise<CheckoutActionResult<EstimateShippingResult>> {
  return apiAction(`${API_URL}/api/v1/cart/estimate-shipping`, estimateShippingResponseSchema, {
    method: "POST",
    credentials: "include",
    ...jsonBody({ addressId }),
  });
}

export function initiateCheckout(input: {
  addressId: string;
  shippingMethodCode: string;
  notes?: string;
}): Promise<CheckoutActionResult<CheckoutInitiateDto>> {
  return apiAction(`${API_URL}/api/v1/checkout/initiate`, checkoutInitiateResponseSchema, {
    method: "POST",
    credentials: "include",
    ...jsonBody(input),
  });
}
