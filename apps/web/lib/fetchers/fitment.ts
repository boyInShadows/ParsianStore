import { fitmentCheckResponseSchema, type FitmentVerdictDto } from "schemas";
import { API_URL, apiFetch } from "@/lib/api-fetch";

// Client-side only (called from FitmentBanner, which needs the browser's
// own garage state) -- `null` return means "couldn't determine," which the
// banner treats the same as "no active vehicle" (says nothing) rather
// than showing a wrong verdict.
export async function fetchFitmentCheck(
  productId: string,
  vehicleKey: string,
): Promise<FitmentVerdictDto | null> {
  const res = await apiFetch(
    `${API_URL}/api/v1/fitment/check?productId=${productId}&vehicleKey=${encodeURIComponent(vehicleKey)}`,
    fitmentCheckResponseSchema,
  );
  return res.ok ? res.data.data : null;
}
