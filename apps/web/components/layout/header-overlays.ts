/**
 * The header's two route-scoped overlays, as one state machine.
 *
 * `Header` is rendered by the (shop) layout, so next/link does NOT unmount it
 * on a route change -- an overlay opened on `/` would otherwise still be on
 * screen on top of `/c/…`. Both overlays therefore have to close themselves
 * when the route changes, and the obvious `useEffect(() => setOpen(false),
 * [pathname])` is a cascading render that `react-hooks/set-state-in-effect`
 * rejects outright.
 *
 * ## Why the pathname is IN the state rather than compared against it
 *
 * The first cut of this stored "the route this was opened on" and derived
 * `open = openedOn === pathname`, with nothing ever clearing `openedOn` except
 * an explicit close. That closes on a forward navigation and reopens on the
 * way back:
 *
 *   1. open the drawer on `/`            -> openedOn = "/"
 *   2. browser Back to `/faq`            -> derives false, closes. Correct.
 *   3. browser Forward to `/`            -> derives TRUE again, and the drawer
 *                                           reopens with no user action.
 *
 * A pure derivation cannot fix that, because after step 2 the state still says
 * "opened on `/`" and step 3 is indistinguishable from never having left. The
 * question the state has to answer is "have we already reacted to this
 * pathname", not "which pathname were we opened on" -- so `navigate` REBASES
 * the stored pathname as well as clearing the flags, making every route change
 * a one-way edge to closed. Returning to `/` later finds `menu: false`.
 *
 * `Header` dispatches `navigate` during render (React's documented "adjusting
 * state while rendering"), which is why this is a reducer rather than three
 * `useState`s: one dispatch, one re-render, no effect, and the transition is
 * a pure function this repo can unit-test without a DOM.
 */
export type OverlayName = "menu" | "categories";

export type OverlayState = {
  /** The route the flags below were last reconciled against. */
  readonly pathname: string;
  /** The mobile navigation drawer. */
  readonly menu: boolean;
  /** The desktop categories dropdown. */
  readonly categories: boolean;
};

export type OverlayAction =
  { type: "navigate"; pathname: string } | { type: "set"; overlay: OverlayName; open: boolean };

/** Everything closed, rebased onto `pathname`. Also `useReducer`'s init. */
export function initOverlays(pathname: string): OverlayState {
  return { pathname, menu: false, categories: false };
}

export function overlaysReducer(state: OverlayState, action: OverlayAction): OverlayState {
  switch (action.type) {
    case "navigate":
      // Identity return when the route has not actually moved: React bails out
      // of the re-render, so dispatching this on every render is free.
      return state.pathname === action.pathname ? state : initOverlays(action.pathname);
    case "set":
      return { ...state, [action.overlay]: action.open };
  }
}
