import type { ReactNode } from "react";

type Emphasis = "normal" | "muted" | "strong" | "total";

type Props = {
  label: ReactNode;
  value: ReactNode;
  // Codes, phone numbers, postal codes, SKUs, money -- anything a customer
  // would read aloud or compare character by character (§6.5's mono role).
  mono?: boolean;
  emphasis?: Emphasis;
  hint?: ReactNode;
  className?: string;
};

// One definition of a label/value row. `flex items-center justify-between`
// appeared 25 times across the storefront with both sides at the same weight,
// which is why money, dates, statuses and spec values all read as equally
// important. The emphasis scale is the whole point: a total is not a date.
const labelStyles: Record<Emphasis, string> = {
  normal: "text-caption text-text-muted",
  muted: "text-caption text-text-muted",
  strong: "text-body-sm text-text-muted",
  total: "text-body font-medium text-text",
};

const valueStyles: Record<Emphasis, string> = {
  normal: "text-body-sm text-text",
  muted: "text-body-sm text-text-muted",
  strong: "text-body font-medium text-text",
  total: "text-h2 text-price",
};

export function DataRow({
  label,
  value,
  mono = false,
  emphasis = "normal",
  hint,
  className = "",
}: Props) {
  const isTotal = emphasis === "total";

  return (
    <div
      className={`flex flex-wrap items-baseline justify-between gap-3 ${
        isTotal ? "border-t border-border pt-6" : ""
      } ${className}`}
    >
      <span className={labelStyles[emphasis]}>
        {label}
        {hint ? <span className="block text-caption text-text-muted">{hint}</span> : null}
      </span>
      <span className={`${valueStyles[emphasis]} ${mono || isTotal ? "font-mono" : ""}`}>
        {value}
      </span>
    </div>
  );
}
