"use client";

import { useEffect, useId, useRef, type MouseEvent, type ReactNode } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  /**
   * The close button's accessible name. Defaults to Persian, and that is the
   * fix rather than the feature: it was hardcoded `aria-label="Close"`, so a
   * Persian screen reader announced one English word in the middle of an
   * otherwise Persian dialog. An aria-label is user-facing text and falls
   * under CLAUDE.md rule 4 like any other string.
   */
  closeLabel?: string;
  children: ReactNode;
};

// Built on the native <dialog> element deliberately -- it provides a
// correct focus trap, Escape-to-close, and top-layer stacking for free,
// which a hand-rolled implementation would have to reimplement and could
// get wrong (masterPlan.md §10 accessibility floor).
export function Modal({ open, onClose, title, closeLabel = "بستن پنجره", children }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    // A click that lands on the <dialog> element itself (not a descendant)
    // is on the ::backdrop area.
    if (event.target === dialogRef.current) {
      onClose();
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onCancel={onClose}
      onClick={handleBackdropClick}
      aria-labelledby={titleId}
      className="max-w-container rounded-lg border border-border bg-surface p-0 text-text"
    >
      <div className="flex items-center justify-between border-b border-border p-4">
        <h2 id={titleId} className="text-h3 font-semibold">
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={closeLabel}
          className="rounded-md p-1 text-text-muted hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          <CloseIcon />
        </button>
      </div>
      <div className="p-4">{children}</div>
    </dialog>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        d="m6 6 12 12M18 6 6 18"
      />
    </svg>
  );
}
