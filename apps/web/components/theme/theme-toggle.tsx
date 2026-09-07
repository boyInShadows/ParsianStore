"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";

const subscribeNever = () => () => {};

/** True once the client has hydrated; false during the server render and
 * the initial client render, so the two match and React never warns about
 * a mismatch. This is the supported way to gate client-only UI (like a
 * theme toggle, which can't know resolvedTheme until after hydration)
 * without the `useEffect(() => setState(true))` pattern, which trips
 * react-hooks/set-state-in-effect. */
function useHasHydrated() {
  return useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );
}

type Props = {
  /** The button's accessible name. STABLE -- it names the feature ("dark
   *  theme"), never the next action; `aria-pressed` is what says whether the
   *  feature is on. See the note below. */
  label: string;
};

/**
 * Standalone theme toggle -- masterPlan.md §6.7/§10 (keyboard reachable,
 * visible focus, reduced-motion safe: only color/opacity transition here).
 *
 * ## Why the name is stable, and why it is a prop
 *
 * A toggle button reports state through `aria-pressed`, so its accessible name
 * must stay FIXED and name the feature -- the way a Mute button stays "Mute"
 * whether or not sound is currently muted. Pairing `aria-pressed` with a name
 * that describes the next action instead is the documented anti-pattern, and
 * this component shipped it: the name flipped between «تغییر به تم روشن» and
 * «تغییر به تم تیره», so in dark mode a screen reader announced "switch to
 * light theme, button, pressed" -- "pressed" appearing to confirm the one
 * thing that is not true. One name now, «حالت تیره», with `aria-pressed`
 * carrying the state: "dark theme, button, pressed" = the dark theme is on.
 *
 * It is a prop rather than a `useTranslations` call because this renders
 * inside the Header on every route including the landing page, whose JS budget
 * P4.S4 already blew once by calling that hook in a Client Component. It was
 * also a hardcoded English string before P14.S2, in an app whose only shipping
 * locale is Persian -- the one control a screen-reader user needs a name for,
 * announcing in the wrong language.
 *
 * ## Why it does not paint its own colours any more
 *
 * It used to set `border-border text-text-muted` -- page-theme tokens -- inside
 * a header that was `bg-graphite-950` in BOTH themes. In light mode that put a
 * 12.25:1 ring around a 3.38:1 glyph, which reads as an empty circle: the
 * outline was the only thing with contrast. The header follows the theme now
 * (P14.S2), so the tokens finally describe the ground they sit on, and the
 * glyph takes `text-text` rather than `text-text-muted` so the icon -- not the
 * ring -- is the part that carries the control.
 */
export function ThemeToggle({ label }: Props) {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useHasHydrated();

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <button
      type="button"
      disabled={!mounted}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={label}
      // The name above never changes; this is what changes. pressed = "the
      // dark theme is on". The glyph still shows the destination rather than
      // the state -- a sun to go light -- which is the sighted convention and
      // cannot conflict with the name, because both icons are aria-hidden.
      aria-pressed={isDark}
      className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-border text-text transition-colors duration-fast hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:opacity-0"
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.75" />
      <path
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        d="M12 2.5v2M12 19.5v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2.5 12h2M19.5 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
        d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z"
      />
    </svg>
  );
}
