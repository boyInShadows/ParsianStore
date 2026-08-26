import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Props = {
  children: ReactNode;
  onRemove?: () => void;
  removeLabel?: string;
};

export function Chip({ children, onRemove, removeLabel = "Remove" }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-border bg-surface-raised text-body-sm text-text",
        // A chip carrying a remove button is an interactive control on the
        // PLP filter bar, so it has to clear masterPlan §10's 44px floor.
        // The glyph stays 12px; the button's own box is what grows, and the
        // chip drops its inline-end padding so the target does not just add
        // width. A decorative chip keeps the original compact shape.
        onRemove ? "min-h-12 pe-0 ps-3" : "px-3 py-1",
      )}
    >
      {children}
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={removeLabel}
          className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-text-muted transition-colors duration-fast hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus motion-reduce:transition-none"
        >
          <CloseIcon />
        </button>
      ) : null}
    </span>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" aria-hidden="true">
      <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}
