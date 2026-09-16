import { buildVehicleKey, parseVehicleKey, type VehicleKeyParts } from "schemas/vehicle-key";
import { toPersianDigits } from "schemas/fa-text";
import type { GarageVehicle } from "@/stores/garage-store";

/**
 * The rules behind `hooks/use-garage-url-sync.ts`, split out of it so they can
 * be unit-tested: the hook itself imports `@/i18n/navigation`, whose
 * `next-intl` -> `next/navigation` chain does not resolve under vitest's node
 * environment. Nothing here touches React, the router, or the DOM.
 */

/**
 * Routes where the active vehicle changes what is *rendered* -- and therefore
 * the only routes that write `?v=` into the URL. Matched by shape, because all
 * three are dynamic:
 *
 *  - `/c/<slug>`     the category PLP reads `searchParams.v` SERVER-side and
 *                    feeds it into the SSR catalog fetch (`c/[slug]/page.tsx`
 *                    -> `parseFilters`). This one is load-bearing.
 *  - `/brand/<slug>` renders `FilterBar`, whose "fits my vehicle" control is
 *                    driven by the active vehicle.
 *  - `/p/<slug>`     the PDP renders `FitmentBanner`, whose verdict is per
 *                    active vehicle.
 *
 * Everywhere else the param changed nothing and just made every shop URL 115
 * characters longer -- `/?v=<uuid>.<uuid>.<uuid>.<year>` on the landing page
 * being the visible case. Adding a route later (e.g. `/search`) is one line
 * here. Reading `?v=` stays global: see `restoreVehicleFromUrl`.
 */
export const VEHICLE_URL_ROUTE_PREFIXES = ["/c", "/brand", "/p"] as const;

/**
 * `pathname` is next-intl's (`@/i18n/navigation`), which is the locale-
 * UNPREFIXED path -- `/c/engine`, never `/fa/c/engine` or `/en/c/engine`
 * (`useBasePathname` strips the prefix, and `routing.pathnames` is unset so
 * there is no per-locale rewriting either).
 *
 * A bare `/c` is not a route and must not be matched into existence, so a
 * prefix only counts when a non-empty segment follows it. That also keeps the
 * near-misses out: `/compare` is not `/c/...`, `/profile` is not `/p/...`.
 */
export function shouldSyncVehicleToUrl(pathname: string): boolean {
  return VEHICLE_URL_ROUTE_PREFIXES.some(
    (prefix) => pathname.startsWith(`${prefix}/`) && pathname.length > prefix.length + 1,
  );
}

/**
 * The href the store -> URL effect should `router.replace` to, or `null` when
 * the URL already says the right thing. Pure, so the whole write / strip /
 * preserve decision is testable on its own.
 *
 * Other query params (`sort`, `brand`, `cursor`, ...) are carried across
 * untouched -- only `v` is ever set or deleted.
 */
export function vehicleSyncTarget(args: {
  pathname: string;
  searchParams: URLSearchParams;
  activeKey: string | null;
}): string | null {
  const { pathname, searchParams, activeKey } = args;
  const desired = shouldSyncVehicleToUrl(pathname) ? activeKey : null;
  if (desired === searchParams.get("v")) return null;

  const params = new URLSearchParams(searchParams);
  if (desired !== null) params.set("v", desired);
  else params.delete("v");

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

/**
 * URL -> store: reads the `?v=` a document load arrived with and restores
 * that vehicle, on whichever route the link points at -- allowlisted or not.
 * Reading is not limited to the routes that write.
 *
 * What it does NOT do, since the calling comment is easy to over-read: the
 * caller invokes this ONCE PER TAB SESSION, not once per navigation. Its
 * once-guard is a ref on `useGarageUrlSync`, whose component is mounted in the
 * `(shop)` layout, and Next.js does not remount a layout across client-side
 * soft navigations. A `?v=` that first appears via an in-app soft nav is
 * therefore never restored -- and on a non-allowlisted route `vehicleSyncTarget`
 * will strip it. Known, accepted for now, and currently unreachable: no shipped
 * UI links to a `?v=` URL. See the header comment on `useGarageUrlSync` for why
 * re-arming it is the owner's call and not a fix to make here.
 *
 * `onSettled` is the signal the store -> URL effect waits on before it is
 * allowed to strip `?v=`, and it is the reason this is a function taking
 * callbacks rather than an inlined effect body: it fires SYNCHRONOUSLY when
 * there was nothing to resolve (no `v`, a malformed `v`, or a vehicle already
 * in the garage), and otherwise only once `resolveVehicleLabel` settles --
 * either outcome, a label or `null`. Stripping before that point would delete
 * the key while the only copy of it is still an in-flight promise, and someone
 * else's share link would silently do nothing.
 */
export function restoreVehicleFromUrl(args: {
  v: string | null;
  vehicles: readonly GarageVehicle[];
  setActive: (key: string) => void;
  addVehicle: (vehicle: GarageVehicle) => void;
  /** Guards the async path against writing after unmount. */
  isMounted: () => boolean;
  onSettled: () => void;
}): void {
  const { v, vehicles, setActive, addVehicle, isMounted, onSettled } = args;
  if (!v) {
    onSettled();
    return;
  }

  let parts: VehicleKeyParts;
  try {
    parts = parseVehicleKey(v);
  } catch {
    onSettled(); // malformed share link -- ignore, don't crash the page over it
    return;
  }

  const key = buildVehicleKey(parts);
  if (vehicles.some((vehicle) => buildVehicleKey(vehicle) === key)) {
    setActive(key);
    onSettled();
    return;
  }

  void resolveVehicleLabel(parts)
    .then((label) => {
      if (label && isMounted()) addVehicle({ ...parts, label });
    })
    .finally(() => {
      if (isMounted()) onSettled();
    })
    // NOT dead code, and not a duplicate of `resolveVehicleLabel`'s own
    // try/catch: that one only covers the fetching. If `addVehicle` throws
    // synchronously in the `.then()` above, the rejection has nowhere left to
    // go and surfaces as an `unhandledrejection`. `.finally()` runs either
    // way, so the gate can never wedge -- this exists purely to keep a store
    // failure from becoming a console-level page error. Deleting it fails
    // "settles, and stays handled, when the store write itself throws".
    .catch(() => {});
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
