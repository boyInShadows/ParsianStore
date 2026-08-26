import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Elevation = "flat" | "raised" | "floating";

type Props = {
  children: ReactNode;
  // One fixed look for every card is the "uniform radius, spacing and
  // shadows across every component" anti-pattern. `flat` is for a card
  // sitting inside another surface, `raised` (default) keeps the shipped
  // look, `floating` is for something genuinely lifted off the page.
  elevation?: Elevation;
  // Adds the hover/focus language for a card the user can act on. A card
  // that does nothing must not pretend it does.
  interactive?: boolean;
  className?: string;
};

// shadow-* already resolves to `none` under [data-theme="dark"] via
// tokens.css -- dark mode gets its elevation from --surface-raised +
// --border instead (masterPlan.md §6.6), no separate dark: override needed.
const elevations: Record<Elevation, string> = {
  flat: "bg-surface",
  raised: "bg-surface shadow-sm",
  floating: "bg-surface shadow-md",
};

const interactiveStyles =
  "transition-all duration-fast motion-reduce:transition-none " +
  "hover:border-brand hover:shadow-md focus-within:border-brand " +
  "focus-within:ring-2 focus-within:ring-focus focus-within:ring-offset-2 focus-within:ring-offset-bg";

export function Card({
  children,
  elevation = "raised",
  interactive = false,
  className = "",
}: Props) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border p-4",
        elevations[elevation],
        interactive && interactiveStyles,
        className,
      )}
    >
      {children}
    </div>
  );
}
