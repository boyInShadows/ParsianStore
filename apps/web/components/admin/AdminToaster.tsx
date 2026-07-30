"use client"; // reads the shared toast store, renders MUI Snackbar/Alert

import { Snackbar, Alert, type AlertColor } from "@mui/material";
import { useToastStore, type ToastTone } from "@/stores/toast-store";

// (shop)'s own <Toaster/> (components/primitives/Toast.tsx) is styled with
// raw Tailwind classnames -- meaningless under (admin), since Tailwind's
// content glob excludes app/(admin)/** entirely (masterPlan §7.4's
// physical separation covers styling, not the underlying state layer).
// This reads the SAME shared stores/toast-store.ts (one toast queue for
// the whole app) but renders it through MUI's own Snackbar/Alert instead
// of reimplementing toast state management a second time.
const TONE_TO_SEVERITY: Record<ToastTone, AlertColor> = {
  neutral: "info",
  success: "success",
  warning: "warning",
  danger: "error",
};

export function AdminToaster() {
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);
  const current = toasts[0];

  return (
    <Snackbar
      open={current !== undefined}
      autoHideDuration={5000}
      onClose={() => current && dismiss(current.id)}
      anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
    >
      {current ? (
        <Alert
          severity={TONE_TO_SEVERITY[current.tone]}
          onClose={() => dismiss(current.id)}
          variant="filled"
        >
          {current.message}
        </Alert>
      ) : undefined}
    </Snackbar>
  );
}
