import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
};

export function Card({ children, className = "" }: Props) {
  return (
    <div
      // shadow-sm already resolves to `none` under [data-theme="dark"] via
      // tokens.css -- dark mode gets its elevation from --surface-raised +
      // --border instead (masterPlan.md §6.6), no separate dark: override needed.
      className={`rounded-lg border border-border bg-surface p-4 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}
