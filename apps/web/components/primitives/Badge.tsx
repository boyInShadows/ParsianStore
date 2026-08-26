import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "brand" | "success" | "warning" | "danger" | "info" | "neutral";
type Variant = "solid" | "dot";

type Props = {
  tone?: Tone;
  // "dot" renders a leading node in the tone's own color on a neutral
  // ground -- the same shape language OrderStatusRail uses, so a status
  // reads identically whether it appears as a badge in a list or as a node
  // on a timeline. "solid" (default) is the shipped look.
  variant?: Variant;
  children: ReactNode;
};

// Warning is always outlined + icon-led, never solid -- masterPlan.md §6.3,
// so it can never be mistaken for a CTA sitting next to Marigold (their
// hues are close -- see tokens.css's header comment).
// Each fill pairs with its own contrast-safe foreground token rather than a
// blanket --brand-fg: white on `success` is 3.30:1 light / 2.27:1 dark and on
// `danger` 3.38:1 in dark, all below AA. See tokens.css for the numbers.
const tones: Record<Tone, string> = {
  brand: "bg-brand-solid text-brand-fg",
  success: "bg-success text-success-fg",
  danger: "bg-danger text-danger-fg",
  info: "bg-info text-info-fg",
  neutral: "bg-surface-raised text-text-muted",
  warning: "border border-warning text-warning bg-transparent",
};

const dotColors: Record<Tone, string> = {
  brand: "bg-brand-solid",
  success: "bg-success",
  danger: "bg-danger",
  info: "bg-info",
  neutral: "bg-text-muted",
  warning: "bg-warning",
};

export function Badge({ tone = "neutral", variant = "solid", children }: Props) {
  const base = "inline-flex items-center gap-2 rounded-full px-2 py-1 text-caption font-medium";

  if (variant === "dot") {
    return (
      <span className={cn(base, "border border-border bg-surface text-text")}>
        <span aria-hidden="true" className={cn("h-2 w-2 rounded-full", dotColors[tone])} />
        {children}
      </span>
    );
  }

  return <span className={cn(base, tones[tone])}>{children}</span>;
}
