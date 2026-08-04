"use client";

import { useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useToastStore, type ToastTone } from "@/stores/toast-store";

const toneStyles: Record<ToastTone, string> = {
  neutral: "border-border bg-surface text-text",
  success: "border-success bg-surface text-success",
  warning: "border-warning bg-surface text-warning",
  danger: "border-danger bg-surface text-danger",
};

const AUTO_DISMISS_MS = 5000;

// Module-level so its identity is stable across renders -- this store never
// changes after mount, so there is genuinely nothing to subscribe to.
const subscribeToNothing = () => () => {};

function ToastItemView({ id, message, tone }: { id: string; message: string; tone: ToastTone }) {
  const dismiss = useToastStore((state) => state.dismiss);

  useEffect(() => {
    const timer = setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [id, dismiss]);

  return (
    <div
      role="status"
      className={`pointer-events-auto rounded-md border px-4 py-2 text-body-sm shadow-md ${toneStyles[tone]}`}
    >
      {message}
    </div>
  );
}

/**
 * Renders every active toast via a portal to <body>, stacked at the
 * inline-end/bottom corner. Mount once, near the app root. `role="status"`
 * on each item (not the container) so screen readers announce toasts as
 * they arrive without re-announcing the whole stack.
 */
export function Toaster() {
  const toasts = useToastStore((state) => state.toasts);
  // `typeof document === "undefined"` was the gate here, which is the exact
  // server/client branch React's hydration-mismatch error names first: the
  // server rendered null and the client's FIRST render produced the portal,
  // so every page carrying <Toaster/> (i.e. the whole (shop) layout) threw
  // "Hydration failed because the server rendered HTML didn't match" and
  // silently re-rendered the tree on the client. Found by reading the dev
  // overlay's own "1 Issue" counter during the design pass, not by a test.
  // A mount flag makes the server render and the first client render agree.
  // useSyncExternalStore rather than useState+useEffect: it is React's own
  // hydration-safe "server said X, client says Y" primitive (the server
  // snapshot is a separate argument), and `react-hooks/set-state-in-effect`
  // rightly rejects the setState-in-an-effect version.
  const mounted = useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );

  if (!mounted) return null;

  return createPortal(
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 end-4 z-50 flex flex-col gap-2"
    >
      {toasts.map((toast) => (
        <ToastItemView key={toast.id} {...toast} />
      ))}
    </div>,
    document.body,
  );
}
