import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "brand" | "cta" | "ghost" | "outline";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  children: ReactNode;
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-body-sm font-medium " +
  "transition-colors duration-fast motion-reduce:transition-none " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg " +
  "disabled:pointer-events-none disabled:opacity-50";

// Steel Blue owns navigation/brand affordances; Racing Red owns money/action
// only -- masterPlan.md §6.3. Never swap which variant a CTA-vs-nav button uses.
const variants: Record<Variant, string> = {
  brand: "bg-brand-solid text-brand-fg hover:opacity-90",
  cta: "bg-cta text-cta-fg hover:opacity-90",
  ghost: "text-text hover:bg-surface-raised",
  outline: "border border-border text-text hover:bg-surface-raised",
};

export function Button({ variant = "brand", className = "", children, ...rest }: Props) {
  return (
    <button type="button" className={`${base} ${variants[variant]} ${className}`} {...rest}>
      {children}
    </button>
  );
}
