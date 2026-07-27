"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { buildVehicleKey, parseVehicleKey, toPersianDigits, type VehicleKeyParts } from "schemas";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useGarageStore } from "@/stores/garage-store";

// masterPlan.md §3.4: "The active vehicle ... is reflected in the URL as
// `?v=<vehicleKey>` so results are shareable and crawlable." Two
// directions, both handled here so any (shop) page can mount this once:
//  - store -> URL: picking a vehicle anywhere updates `?v=` on the
//    current page.
//  - URL -> store (once, on first load): opening a `?v=` link -- e.g. a
//    shared link, or this browser's own reload -- restores that vehicle
//    as active, resolving display names from the API if it's not
//    already a saved garage entry (a link from someone else's garage).
export function useGarageUrlSync(): void {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const activeKey = useGarageStore((state) => state.activeKey);
  const vehicles = useGarageStore((state) => state.vehicles);
  const addVehicle = useGarageStore((state) => state.addVehicle);
  const setActive = useGarageStore((state) => state.setActive);
  const hydratedFromUrl = useRef(false);

  useEffect(() => {
    if (hydratedFromUrl.current) return;
    hydratedFromUrl.current = true;

    const v = searchParams.get("v");
    if (!v) return;

    let parts: VehicleKeyParts;
    try {
      parts = parseVehicleKey(v);
    } catch {
      return; // malformed share link -- ignore, don't crash the page over it
    }

    const key = buildVehicleKey(parts);
    if (vehicles.some((vehicle) => buildVehicleKey(vehicle) === key)) {
      setActive(key);
      return;
    }

    void resolveVehicleLabel(parts).then((label) => {
      if (label) addVehicle({ ...parts, label });
    });
    // Only ever runs once (hydratedFromUrl guards it) -- the effect's own
    // deps are deliberately not re-checked against `vehicles`/`setActive`
    // identity churn on every store update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const current = searchParams.get("v");
    if (activeKey === current) return;

    const params = new URLSearchParams(searchParams);
    if (activeKey) {
      params.set("v", activeKey);
    } else {
      params.delete("v");
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [activeKey, searchParams, pathname, router]);
}

// `fetchMakes`/`fetchModels` are dynamically imported (not a top-level
// import) -- this path only runs for the rare "opened someone else's
// garage link" case, so their Zod-validated response parsing (real
// bundle weight) shouldn't sit in every page's initial JS just for that.
// masterPlan.md §10's dynamic-import rule applies here for the same
// reason it applies to VehicleSelectorLazy.
async function resolveVehicleLabel(parts: VehicleKeyParts): Promise<string | null> {
  try {
    const { fetchMakes, fetchModels } = await import("@/lib/fetchers/vehicles");

    const makes = await fetchMakes();
    const make = makes.find((m) => m.id === parts.makeId);
    if (!make) return null;

    const models = await fetchModels(parts.makeId);
    const model = models.find((m) => m.id === parts.modelId);
    if (!model) return null;

    return `${make.name.fa} ${model.name.fa} ${toPersianDigits(parts.year)}`;
  } catch {
    return null;
  }
}
