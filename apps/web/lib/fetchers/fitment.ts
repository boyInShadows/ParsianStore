import { fitmentCheckResponseSchema, type FitmentVerdictDto } from "schemas";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

// Client-side only (called from FitmentBanner, which needs the browser's
// own garage state) -- `null` return means "couldn't determine," which the
// banner treats the same as "no active vehicle" (says nothing) rather
// than showing a wrong verdict.
export async function fetchFitmentCheck(
  productId: string,
  vehicleKey: string,
): Promise<FitmentVerdictDto | null> {
  try {
    const res = await fetch(
      `${API_URL}/api/v1/fitment/check?productId=${productId}&vehicleKey=${encodeURIComponent(vehicleKey)}`,
    );
    if (!res.ok) return null;
    const json = await res.json();
    const parsed = fitmentCheckResponseSchema.safeParse(json);
    return parsed.success ? parsed.data.data : null;
  } catch {
    return null;
  }
}
