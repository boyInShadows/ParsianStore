"use client";

import { useEffect, useId, useRef, type MouseEvent, type ReactNode } from "react";
import { cx } from "@/lib/cx";

type Side = "start" | "end";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  side?: Side;
  /** The close button's accessible name -- see Modal for why this is a prop
   *  with a Persian default rather than a hardcoded English one. */
  closeLabel?: string;
  children: ReactNode;
};

// The native <dialog> UA stylesheet sets `inset: 0` for centering (all four
// sides at once, for the default modal-centering behavior). Once a fixed
// width is added that over-constrains the box; per the CSS2 abspos spec the
// *start* side is the one dropped to resolve the over-constraint in RTL --
// exactly the side we need, undoing our own positioning. Explicitly setting
// the opposite side to `auto` breaks the tie in our favor instead.
const sidePosition: Record<Side, string> = {
  start: "start-0 end-auto",
  end: "end-0 start-auto",
};

// Same native <dialog> foundation as Modal (focus trap, Escape, top layer),
// positioned as a full-height panel pinned to the logical start/end edge --
// never "left"/"right" (masterPlan.md §7.2).
export function Drawer({
  open,
  onClose,
  title,
  side = "end",
  closeLabel = "بستن کشو",
  children,
}: Props) {
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
      className={cx(
        "fixed top-0 m-0 h-dvh w-full max-w-sm border-s border-border bg-surface p-0 text-text",
        sidePosition[side],
      )}
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
