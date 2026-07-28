"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useToastStore, type ToastTone } from "@/stores/toast-store";

const toneStyles: Record<ToastTone, string> = {
  neutral: "border-border bg-surface text-text",
  success: "border-success bg-surface text-success",
  warning: "border-warning bg-surface text-warning",
  danger: "border-danger bg-surface text-danger",
};

const AUTO_DISMISS_MS = 5000;

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

  if (typeof document === "undefined") return null;

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
