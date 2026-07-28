import { healthResponseSchema, type HealthResponse } from "schemas";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export async function getHealth(): Promise<HealthResponse> {
  const res = await fetch(`${API_URL}/api/v1/health`, { cache: "no-store" });
  const json = await res.json();
  return healthResponseSchema.parse(json);
}
