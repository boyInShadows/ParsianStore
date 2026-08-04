"use client"; // fetches the product by id client-side before rendering the form

import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  type SelectChangeEvent,
} from "@mui/material";
import type { AdminProductDetailDto } from "schemas";
import {
  adjustAdminProductStock,
  archiveAdminProduct,
  fetchAdminProduct,
} from "@/lib/fetchers/admin-products";
import { useToastStore } from "@/stores/toast-store";
import { AdminProductFormContent } from "./AdminProductFormContent";

// Reuses the existing (P3.S6) POST /admin/inventory/adjust endpoint --
// see docs/decisions/0021-p8s2-admin-products.md. Kept as a small,
// separate action here rather than folded into the essential-fields
// edit form: adjusting stock is a distinct, audited operation
// (InventoryMoveModel records every change with a reason), not just
// another field on a PATCH.
function StockAdjustPanel({
  productId,
  currentStock,
  onAdjusted,
}: {
  productId: string;
  currentStock: number;
  onAdjusted: (newStock: number) => void;
}) {
  const showToast = useToastStore((state) => state.show);
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState<"manual-adjustment" | "restock">("restock");
  const [saving, setSaving] = useState(false);

  async function handleAdjust(): Promise<void> {
    const deltaNum = Number(delta);
    if (!deltaNum) return;
    setSaving(true);
    const result = await adjustAdminProductStock(productId, deltaNum, reason);
    setSaving(false);
    if (!result.ok) {
      showToast(result.message, "danger");
      return;
    }
    setDelta("");
    onAdjusted(result.data.stock);
    showToast("موجودی به‌روزرسانی شد", "success");
  }

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 600, mb: 2 }}>
          تنظیم موجودی (موجودی فعلی: {currentStock})
        </Typography>
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
          <TextField
            size="small"
            label="تغییر (مثبت یا منفی)"
            type="number"
            value={delta}
            onChange={(event) => setDelta(event.target.value)}
            sx={{ width: 200 }}
          />
          <Select
            size="small"
            value={reason}
            onChange={(event: SelectChangeEvent) =>
              setReason(event.target.value as "manual-adjustment" | "restock")
            }
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="restock">ورود کالا</MenuItem>
            <MenuItem value="manual-adjustment">اصلاح دستی</MenuItem>
          </Select>
          <Button
            variant="contained"
            disabled={saving || !delta}
            onClick={() => void handleAdjust()}
          >
            {saving ? "در حال ثبت…" : "ثبت تغییر"}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}

export function AdminProductEditContent({ id }: { id: string }) {
  const showToast = useToastStore((state) => state.show);
  const [product, setProduct] = useState<AdminProductDetailDto | null | undefined>(undefined);

  useEffect(() => {
    void fetchAdminProduct(id).then(setProduct);
  }, [id]);

  async function handleArchive(): Promise<void> {
    const result = await archiveAdminProduct(id);
    if (!result.ok) {
      showToast(result.message, "danger");
      return;
    }
    setProduct(result.data);
    showToast("محصول بایگانی شد", "success");
  }

  if (product === undefined) {
    return <Typography color="text.secondary">در حال بارگذاری…</Typography>;
  }
  if (product === null) {
    return <Typography color="error">محصول یافت نشد</Typography>;
  }

  return (
    <Stack spacing={3}>
      <StockAdjustPanel
        productId={id}
        currentStock={product.stock}
        onAdjusted={(stock) => setProduct({ ...product, stock })}
      />
      <AdminProductFormContent mode="edit" product={product} />
      {product.status !== "archived" ? (
        <Box>
          <Button variant="outlined" color="error" onClick={() => void handleArchive()}>
            بایگانی کردن محصول
          </Button>
        </Box>
      ) : null}
    </Stack>
  );
}
