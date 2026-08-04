"use client"; // Dialog open/close state and a confirm handler.

import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";

type Props = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

/**
 * The first destructive-action confirmation in this codebase, added with the
 * first delete buttons (P8.S4).
 *
 * Deliberately NOT retrofitted onto the cart's "remove item" or the coupon
 * "deactivate" control: both are trivially reversible (re-add, re-open the
 * date), and P7.S2 explicitly chose no confirmation for address delete on
 * that basis. Deleting a category or brand is different in kind — it hides a
 * taxonomy node the whole storefront navigates by.
 */
export function AdminConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "حذف",
  busy = false,
  onCancel,
  onConfirm,
}: Props) {
  return (
    <Dialog open={open} onClose={onCancel} aria-labelledby="admin-confirm-title">
      <DialogTitle id="admin-confirm-title">{title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{description}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={busy}>
          انصراف
        </Button>
        <Button onClick={onConfirm} color="error" variant="contained" disabled={busy}>
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
