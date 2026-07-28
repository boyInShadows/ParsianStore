import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  onRemove?: () => void;
  removeLabel?: string;
};

export function Chip({ children, onRemove, removeLabel = "Remove" }: Props) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-raised px-3 py-1 text-body-sm text-text">
      {children}
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={removeLabel}
          className="-me-1 inline-flex h-4 w-4 items-center justify-center rounded-full text-text-muted hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
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
