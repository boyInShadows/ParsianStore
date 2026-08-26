import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "brand" | "cta" | "ghost" | "outline";
type Size = "sm" | "md" | "lg" | "icon";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
};

export const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-md font-medium " +
  "transition-colors duration-fast motion-reduce:transition-none " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg " +
  "disabled:pointer-events-none disabled:opacity-50";

// masterPlan §10's accessibility floor requires >= 44x44px touch targets.
// The spacing scale has no 44px step, so every size floors at min-h-12
// (48px) and only the horizontal padding varies -- `sm` is narrower, not
// shorter. `icon` is the square variant that replaces the hand-written
// `h-9 w-9` (36px) and `h-8 w-8` (32px) buttons scattered across the
// header, the cart stepper, and the wishlist toggle, all of which were
// under the floor.
export const buttonSizes: Record<Size, string> = {
  sm: "min-h-12 px-3 text-body-sm",
  md: "min-h-12 px-4 text-body-sm",
  lg: "min-h-12 px-6 text-body",
  icon: "h-12 w-12 p-0",
};

// Steel Blue owns navigation/brand affordances; Marigold owns money/action
// only -- masterPlan.md §6.3. Never swap which variant a CTA-vs-nav button uses.
//
// Hover was `opacity-90` on both filled variants, which is the definition of
// an undesigned state -- it fades the button rather than responding to the
// pointer. Each variant now has a real hover, plus a 1px press shift shared
// by the two filled ones. shadow-* resolves to `none` in dark mode via
// tokens.css, so the CTA's shadow lift is automatically light-mode-only.
export const buttonVariants: Record<Variant, string> = {
  brand: "bg-brand-solid text-brand-fg hover:bg-brand active:translate-y-px",
  cta: "bg-cta text-cta-fg shadow-sm hover:bg-marigold-600 hover:shadow-md active:translate-y-px active:shadow-sm",
  ghost: "text-text hover:bg-surface-raised active:bg-surface-sunken",
  outline:
    "border border-border text-text hover:border-brand hover:bg-surface-raised active:bg-surface-sunken",
};

export function Button({
  variant = "brand",
  size = "md",
  className = "",
  children,
  ...rest
}: Props) {
  return (
    <button
      type="button"
      className={cn(buttonBase, buttonSizes[size], buttonVariants[variant], className)}
      {...rest}
    >
      {children}
    </button>
  );
}
