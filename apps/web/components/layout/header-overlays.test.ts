import { describe, expect, it } from "vitest";

import { initOverlays, overlaysReducer, type OverlayState } from "./header-overlays";

/**
 * The regression these exist for: the drawer reopening itself on a browser
 * FORWARD navigation.
 *
 * The first cut derived `open = openedOn === pathname` and cleared `openedOn`
 * only on an explicit close, so leaving `/` closed the drawer by derivation
 * while the stored value still said "/". Coming back -- forward button,
 * hardware back then forward, an edge-swipe on a phone -- made the same
 * derivation true again and the drawer opened with nobody touching it.
 *
 * The e2e counterpart drives the real browser history: see
 * `e2e/header-overlays.spec.ts`. This file pins the transition itself, which
 * is where the bug actually lived.
 */
describe("overlaysReducer", () => {
  const home = initOverlays("/");

  function navigate(state: OverlayState, pathname: string): OverlayState {
    return overlaysReducer(state, { type: "navigate", pathname });
  }

  function open(state: OverlayState, overlay: "menu" | "categories"): OverlayState {
    return overlaysReducer(state, { type: "set", overlay, open: true });
  }

  it("starts with both overlays closed on the given route", () => {
    expect(home).toEqual({ pathname: "/", menu: false, categories: false });
  });

  it("opens and closes the drawer without touching the route", () => {
    const opened = open(home, "menu");
    expect(opened).toMatchObject({ pathname: "/", menu: true, categories: false });
    expect(overlaysReducer(opened, { type: "set", overlay: "menu", open: false }).menu).toBe(false);
  });

  it("closes the drawer on a route change", () => {
    expect(navigate(open(home, "menu"), "/faq").menu).toBe(false);
  });

  it("closes the categories dropdown on a route change", () => {
    expect(navigate(open(home, "categories"), "/faq").categories).toBe(false);
  });

  it("does not reopen the drawer when the route comes BACK", () => {
    // back, then forward -- the exact sequence the old derivation reopened on.
    const afterBack = navigate(open(home, "menu"), "/faq");
    const afterForward = navigate(afterBack, "/");
    expect(afterForward.menu).toBe(false);
    expect(afterForward.pathname).toBe("/");
  });

  it("does not reopen the categories dropdown when the route comes BACK", () => {
    const afterForward = navigate(navigate(open(home, "categories"), "/faq"), "/");
    expect(afterForward.categories).toBe(false);
  });

  it("rebases the stored route on every navigation, so a later return is clean", () => {
    expect(navigate(open(home, "menu"), "/faq").pathname).toBe("/faq");
  });

  it("returns the same object when the route has not moved", () => {
    // Header dispatches `navigate` on every render; React bails out of the
    // re-render only if the reducer returns the identical object.
    const opened = open(home, "menu");
    expect(navigate(opened, "/")).toBe(opened);
  });
});
