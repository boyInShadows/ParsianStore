import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { fetchVehicleRoute } from "@/lib/fetchers/vehicles";

type Props = {
  children: ReactNode;
  params: Promise<{ make: string; model: string; gen: string }>;
};

/**
 * `/vehicle/[make]/[model]/[gen]`'s not-found decision, above the Suspense
 * boundary.
 *
 * Same mechanism and the same measured evidence as `c/[slug]/layout.tsx` — read
 * that one for why this is a layout and not `generateMetadata`.
 *
 * `fetchVehicleRoute` resolves all three segments at once (unknown make,
 * unknown model, unknown generation year are all `"not-found"`), which is why
 * the decision for this route sits here rather than being split across
 * `vehicle/[make]/` and this segment. It is the argument-identical call the page
 * and `generateMetadata` already make, so it adds no HTTP request.
 *
 * **There is deliberately no `loading.tsx` at `vehicle/[make]/`.** A
 * `loading.tsx` wraps everything below its segment in Suspense — including this
 * layout — which would put this decision back inside the boundary and turn an
 * unknown generation into a soft 200. Measured, not assumed: see
 * `components/loading/loading-boundaries.test.ts`, which asserts that shape so
 * it cannot be added back by accident.
 */
export default async function VehicleGenerationLayout({ children, params }: Props) {
  const { make, model, gen } = await params;
  const vehicle = await fetchVehicleRoute(make, model, gen);

  if (!vehicle.ok && vehicle.reason === "not-found") notFound();

  return children;
}
