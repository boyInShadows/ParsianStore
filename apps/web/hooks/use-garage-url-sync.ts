"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useGarageStore } from "@/stores/garage-store";
import { restoreVehicleFromUrl, vehicleSyncTarget } from "@/lib/garage-url-sync";

// masterPlan.md §3.4: "The active vehicle ... is reflected in the URL as
// `?v=<vehicleKey>` so results are shareable and crawlable." Two
// directions, both handled here so any (shop) page can mount this once:
//  - store -> URL: picking a vehicle updates `?v=` on the current page --
//    but only on the routes in `VEHICLE_URL_ROUTE_PREFIXES`, where the
//    active vehicle actually changes what is rendered. On every other
//    route an already-present `?v=` is stripped instead, once hydration
//    has settled.
//  - URL -> store: a document load whose URL carries `?v=` -- a shared or
//    bookmarked link, or this browser's own reload -- restores that vehicle
//    as active, resolving display names from the API if it's not already a
//    saved garage entry (a link from someone else's garage). This runs on
//    whichever route the link points at, allowlisted or not.
//
// Scope of that second direction, stated exactly: it happens ONCE PER TAB
// SESSION, not once per navigation. `hydratedFromUrl` is a ref, and the ref
// lives as long as this hook's component does -- `GarageUrlSync` is mounted
// in the `(shop)` layout, and Next.js does not remount a layout across
// client-side soft navigations. So a `?v=` that first appears via an in-app
// soft nav is NOT restored, and on a non-allowlisted route the store -> URL
// effect below will strip it. That is a known limitation, accepted for now
// only because no shipped UI produces such a link: nothing in the app links
// to a `?v=` URL, so the case is currently unreachable. It predates the
// route allowlist. Re-arming the restore per navigation is deliberately not
// done here -- it is entangled with an open product question (restoring
// someone else's link writes their car permanently into your garage via
// `addVehicle`), and the owner decides the two together.
//
// The rules both directions read live in `@/lib/garage-url-sync`, which is
// where they are unit-tested.
export function useGarageUrlSync(): void {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const activeKey = useGarageStore((state) => state.activeKey);
  const vehicles = useGarageStore((state) => state.vehicles);
  const addVehicle = useGarageStore((state) => state.addVehicle);
  const setActive = useGarageStore((state) => state.setActive);
  const hydratedFromUrl = useRef(false);
  // NOT the same thing as `hydratedFromUrl`, and the distinction is the whole
  // race: that ref says the URL -> store effect has RUN, this says it has
  // FINISHED. Only the second one makes it safe to delete `?v=` from the URL
  // -- for a vehicle that is not already in the garage the restore is async,
  // and stripping mid-flight loses the shared vehicle entirely. Seeded true
  // when there is no `v` at all, so the common case costs no extra render and
  // the store -> URL effect is unblocked from the first commit.
  const [hydrationSettled, setHydrationSettled] = useState(() => !searchParams.get("v"));
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (hydratedFromUrl.current) return;
    hydratedFromUrl.current = true;

    restoreVehicleFromUrl({
      v: searchParams.get("v"),
      vehicles,
      setActive,
      addVehicle,
      isMounted: () => mounted.current,
      onSettled: () => setHydrationSettled(true),
    });
    // Only ever runs once (hydratedFromUrl guards it) -- the effect's own
    // deps are deliberately not re-checked against `vehicles`/`setActive`
    // identity churn on every store update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hydrationSettled) return;
    const target = vehicleSyncTarget({ pathname, searchParams, activeKey });
    if (target !== null) router.replace(target, { scroll: false });
  }, [activeKey, searchParams, pathname, router, hydrationSettled]);
}
