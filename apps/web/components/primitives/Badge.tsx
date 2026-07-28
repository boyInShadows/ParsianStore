import type { ReactNode } from "react";

type Tone = "brand" | "success" | "warning" | "danger" | "info" | "neutral";

type Props = {
  tone?: Tone;
  children: ReactNode;
};

// Warning is always outlined + icon-led, never solid -- masterPlan.md §6.3,
// so it can never be mistaken for a CTA sitting next to Marigold (their
// hues are close -- see tokens.css's header comment).
const tones: Record<Tone, string> = {
  brand: "bg-brand-solid text-brand-fg",
  success: "bg-success text-brand-fg",
  danger: "bg-danger text-brand-fg",
  info: "bg-info text-brand-fg",
  neutral: "bg-surface-raised text-text-muted",
  warning: "border border-warning text-warning bg-transparent",
};

export function Badge({ tone = "neutral", children }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-caption font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
