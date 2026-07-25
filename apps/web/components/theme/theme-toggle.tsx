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

/**
 * Standalone theme toggle -- masterPlan.md §6.7/§10 (keyboard reachable,
 * visible focus, reduced-motion safe: only color/opacity transition here).
 * Gets folded into the Header in P1.S9; kept as its own component now so
 * P1.S5 has a real, reusable deliverable rather than inline page markup.
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useHasHydrated();

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <button
      type="button"
      disabled={!mounted}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className="h-9 w-9 inline-flex items-center justify-center rounded-full border border-border text-text-muted transition-colors duration-fast hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:opacity-0"
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
