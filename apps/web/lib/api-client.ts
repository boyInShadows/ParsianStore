import { healthResponseSchema, type HealthResponse } from "schemas";
import { API_URL } from "@/lib/api-fetch";

export async function getHealth(): Promise<HealthResponse> {
  const res = await fetch(`${API_URL}/api/v1/health`, { cache: "no-store" });
  const json = await res.json();
  return healthResponseSchema.parse(json);
}
