/**
 * Motion constants for Framer Motion (the "motion" package) -- mirrors
 * styles/tokens.css §6.6 exactly. Framer Motion's `transition` prop needs
 * real numbers (seconds) and cubic-bezier arrays, not CSS var() strings --
 * same category of exception as lib/mui-theme.ts's literal hex colors.
 * Keep both files in sync by hand if these values ever change.
 */
export const DURATION = {
  fast: 0.15, // --duration-fast: 150ms
  base: 0.25, // --duration-base: 250ms
  slow: 0.4, // --duration-slow: 400ms
} as const;

export const EASE_OUT = [0.16, 1, 0.3, 1] as const; // --ease-out
export const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const; // --ease-in-out

// masterPlan.md §5 motion budget: scroll-reveal travel stays <= 24px.
export const REVEAL_TRAVEL_PX = 16;
