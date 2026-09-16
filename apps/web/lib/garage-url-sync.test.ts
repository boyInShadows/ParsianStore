import { afterEach, describe, expect, it, vi } from "vitest";

import { buildVehicleKey } from "schemas/vehicle-key";
import { toPersianDigits } from "schemas/fa-text";
import { useGarageStore } from "@/stores/garage-store";

import {
  restoreVehicleFromUrl,
  shouldSyncVehicleToUrl,
  vehicleSyncTarget,
  VEHICLE_URL_ROUTE_PREFIXES,
} from "./garage-url-sync.js";

/**
 * ## What this guards
 *
 * `?v=<vehicleKey>` used to be written onto **every** shop page, because
 * `GarageUrlSync` is mounted in the `(shop)` layout. The key is three UUIDs
 * and a year -- 115 characters -- so the landing page read
 * `/?v=01a0499c-....2020` while changing nothing about what it rendered.
 *
 * The rule now: **write** `?v=` only where the active vehicle changes what is
 * shown (`/c/*`, `/brand/*`, `/p/*`), **read** it everywhere, and **strip** a
 * stale one everywhere else.
 *
 * Two things here are not visible in a diff and are the reason this file
 * exists:
 *
 * 1. **The share link must survive the strip.** URL -> store is still global,
 *    so a bookmarked `/cart?v=...` restores the vehicle before the param is
 *    removed. For a vehicle that is not already in the garage that restore is
 *    *async* (`resolveVehicleLabel` hits the API for display names). If the
 *    strip ran first, the only copy of the key would be deleted while the
 *    resolve was still in flight and the link would silently do nothing.
 *    `restoreVehicleFromUrl` therefore reports `onSettled` synchronously only
 *    when there was nothing to resolve, and otherwise after the promise
 *    settles -- that is the signal the strip waits on.
 * 2. **The allowlist matches route *shape*, not a list of slugs.** All three
 *    routes are dynamic, and the near-misses (`/compare`, `/profile`) share a
 *    first letter with two of them.
 */

const MAKE_ID = "01a0499c-1111-4111-8111-111111111111";
const MODEL_ID = "01a0499c-2222-4222-8222-222222222222";
const GEN_ID = "01a0499c-3333-4333-8333-333333333333";
const YEAR = 1390;

const PRIDE = { makeId: MAKE_ID, modelId: MODEL_ID, genId: GEN_ID, year: YEAR };
const KEY = buildVehicleKey(PRIDE);

// The API behind `resolveVehicleLabel`'s dynamic import. Hoisted so the mock
// factory can close over it and each test can restate what the API returns.
const api = vi.hoisted(() => ({
  makes: [] as Array<{ id: string; name: { fa: string; en: string } }>,
  models: [] as Array<{ id: string; name: { fa: string; en: string } }>,
}));

vi.mock("@/lib/fetchers/vehicles", () => ({
  fetchMakes: () => Promise.resolve(api.makes),
  fetchModels: () => Promise.resolve(api.models),
}));

function seedApi(): void {
  api.makes = [{ id: MAKE_ID, name: { fa: "سایپا", en: "Saipa" } }];
  api.models = [{ id: MODEL_ID, name: { fa: "پراید ۱۳۱", en: "Pride 131" } }];
}

/** Lets a promise chain (dynamic import + two awaited fetches) drain. */
function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

afterEach(() => {
  useGarageStore.setState({ vehicles: [], activeKey: null });
  api.makes = [];
  api.models = [];
});

describe("shouldSyncVehicleToUrl", () => {
  // Every shipped `(shop)` route, sorted into the two buckets. `/c`, `/brand`
  // and `/p` bare are not routes and must not be matched into existence;
  // `/compare` and `/profile` are the prefix near-misses.
  const ALLOWED = [
    "/c/engine",
    "/c/filters-fluids",
    "/brand/saipa",
    "/brand/a",
    "/p/lastik-pride-131",
    "/p/x",
  ];

  const EXCLUDED = [
    "/",
    "/c",
    "/c/",
    "/brand",
    "/brand/",
    "/p",
    "/p/",
    "/compare",
    "/profile",
    "/search",
    "/vehicle/saipa",
    "/vehicle/saipa/pride-131/1390",
    "/cart",
    "/checkout",
    "/checkout/result",
    "/garage",
    "/wishlist",
    "/orders",
    "/orders/PS-1001",
    "/account",
    "/addresses",
    "/auth/login",
    "/about",
    "/faq",
    "/contact",
    "/styleguide",
  ];

  it.each(ALLOWED)("writes `?v=` on %s", (pathname) => {
    expect(shouldSyncVehicleToUrl(pathname)).toBe(true);
  });

  it.each(EXCLUDED)("does not write `?v=` on %s", (pathname) => {
    expect(shouldSyncVehicleToUrl(pathname)).toBe(false);
  });

  it("keeps the allowlist to the three routes the vehicle actually changes", () => {
    expect([...VEHICLE_URL_ROUTE_PREFIXES]).toEqual(["/c", "/brand", "/p"]);
  });
});

describe("vehicleSyncTarget", () => {
  it("writes the active vehicle onto an allowlisted route", () => {
    // `/c/[slug]` reads `searchParams.v` server-side and feeds it to the SSR
    // catalog fetch -- if this one ever stops writing, PLP fitment filtering
    // silently stops working.
    expect(
      vehicleSyncTarget({
        pathname: "/c/engine",
        searchParams: new URLSearchParams("sort=newest"),
        activeKey: KEY,
      }),
    ).toBe(`/c/engine?sort=newest&v=${KEY}`);
  });

  it("does not write the active vehicle onto a route that ignores it", () => {
    expect(
      vehicleSyncTarget({
        pathname: "/",
        searchParams: new URLSearchParams(),
        activeKey: KEY,
      }),
    ).toBeNull();
  });

  it("strips an existing `?v=` off a non-allowlisted route, keeping every other param", () => {
    expect(
      vehicleSyncTarget({
        pathname: "/cart",
        searchParams: new URLSearchParams(`utm_source=sms&v=${KEY}&step=2`),
        activeKey: KEY,
      }),
    ).toBe("/cart?utm_source=sms&step=2");
  });

  it("strips the last param cleanly, leaving no trailing `?`", () => {
    expect(
      vehicleSyncTarget({
        pathname: "/",
        searchParams: new URLSearchParams(`v=${KEY}`),
        activeKey: KEY,
      }),
    ).toBe("/");
  });

  it("is a no-op when an allowlisted route already carries the right key", () => {
    expect(
      vehicleSyncTarget({
        pathname: "/p/lastik-pride-131",
        searchParams: new URLSearchParams(`v=${KEY}`),
        activeKey: KEY,
      }),
    ).toBeNull();
  });

  it("clears a stale key on an allowlisted route once no vehicle is active", () => {
    expect(
      vehicleSyncTarget({
        pathname: "/brand/saipa",
        searchParams: new URLSearchParams(`v=${KEY}`),
        activeKey: null,
      }),
    ).toBe("/brand/saipa");
  });
});

describe("restoreVehicleFromUrl", () => {
  it("settles synchronously when there is no `?v=` to read", () => {
    const onSettled = vi.fn();
    restoreVehicleFromUrl({
      v: null,
      vehicles: [],
      setActive: vi.fn(),
      addVehicle: vi.fn(),
      isMounted: () => true,
      onSettled,
    });
    expect(onSettled).toHaveBeenCalledTimes(1);
  });

  it("settles synchronously, and writes nothing, for a malformed key", () => {
    const onSettled = vi.fn();
    const addVehicle = vi.fn();
    const setActive = vi.fn();
    restoreVehicleFromUrl({
      v: "not-a-vehicle-key",
      vehicles: [],
      setActive,
      addVehicle,
      isMounted: () => true,
      onSettled,
    });
    expect(onSettled).toHaveBeenCalledTimes(1);
    expect(addVehicle).not.toHaveBeenCalled();
    expect(setActive).not.toHaveBeenCalled();
  });

  it("activates an already-saved vehicle synchronously", () => {
    const order: string[] = [];
    restoreVehicleFromUrl({
      v: KEY,
      vehicles: [{ ...PRIDE, label: "سایپا پراید ۱۳۱ ۱۳۹۰" }],
      setActive: (key) => order.push(`setActive:${key}`),
      addVehicle: () => order.push("addVehicle"),
      isMounted: () => true,
      onSettled: () => order.push("settled"),
    });
    // No await: nothing had to be resolved, so the strip is free immediately.
    expect(order).toEqual([`setActive:${KEY}`, "settled"]);
  });

  it("restores a shared `?v=` on a non-allowlisted route, and the strip waits for the resolve", async () => {
    seedApi();
    const order: string[] = [];
    let settled = false;

    restoreVehicleFromUrl({
      v: KEY,
      vehicles: useGarageStore.getState().vehicles,
      setActive: useGarageStore.getState().setActive,
      addVehicle: (vehicle) => {
        order.push("addVehicle");
        useGarageStore.getState().addVehicle(vehicle);
      },
      isMounted: () => true,
      onSettled: () => {
        order.push("settled");
        settled = true;
      },
    });

    // The race, pinned: the vehicle is not in the store yet AND hydration has
    // not settled, so the store -> URL effect is still gated and cannot have
    // deleted the key it is being resolved from.
    expect(settled).toBe(false);
    expect(useGarageStore.getState().activeKey).toBeNull();

    await vi.waitFor(() => expect(settled).toBe(true));

    expect(order).toEqual(["addVehicle", "settled"]);
    expect(useGarageStore.getState().activeKey).toBe(KEY);
    expect(useGarageStore.getState().vehicles[0]?.label).toBe(
      `سایپا پراید ۱۳۱ ${toPersianDigits(YEAR)}`,
    );

    // Only now is the strip allowed to run -- and the vehicle survives it.
    expect(
      vehicleSyncTarget({
        pathname: "/cart",
        searchParams: new URLSearchParams(`v=${KEY}`),
        activeKey: KEY,
      }),
    ).toBe("/cart");
    expect(useGarageStore.getState().vehicles).toHaveLength(1);
  });

  it("still settles when the vehicle cannot be resolved, so the strip is never wedged", async () => {
    api.makes = []; // API up, but this make is not in the tree
    let settled = false;
    const addVehicle = vi.fn();

    restoreVehicleFromUrl({
      v: KEY,
      vehicles: [],
      setActive: vi.fn(),
      addVehicle,
      isMounted: () => true,
      onSettled: () => {
        settled = true;
      },
    });

    await vi.waitFor(() => expect(settled).toBe(true));
    expect(addVehicle).not.toHaveBeenCalled();
  });

  it("settles, and stays handled, when the store write itself throws", async () => {
    // The terminal `.catch` in the chain: `resolveVehicleLabel` swallows its
    // own fetch errors, but a throw from `addVehicle` inside `.then()` would
    // escape as an `unhandledrejection`. The gate must still open either way.
    seedApi();
    let settled = false;
    const onRejection = vi.fn();
    process.on("unhandledRejection", onRejection);

    try {
      restoreVehicleFromUrl({
        v: KEY,
        vehicles: [],
        setActive: vi.fn(),
        addVehicle: () => {
          throw new Error("store exploded");
        },
        isMounted: () => true,
        onSettled: () => {
          settled = true;
        },
      });

      await vi.waitFor(() => expect(settled).toBe(true));
      await flush();
      expect(onRejection).not.toHaveBeenCalled();
    } finally {
      process.off("unhandledRejection", onRejection);
    }
  });

  it("writes nothing after unmount", async () => {
    seedApi();
    const onSettled = vi.fn();
    const addVehicle = vi.fn();

    restoreVehicleFromUrl({
      v: KEY,
      vehicles: [],
      setActive: vi.fn(),
      addVehicle,
      isMounted: () => false,
      onSettled,
    });

    await flush();
    await flush();
    expect(addVehicle).not.toHaveBeenCalled();
    expect(onSettled).not.toHaveBeenCalled();
  });
});
