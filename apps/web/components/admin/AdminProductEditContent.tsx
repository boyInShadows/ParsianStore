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
  uploadAdminProductMedia,
  removeAdminProductMedia,
  updateAdminProduct,
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

function MediaPanel({
  product,
  onChange,
}: {
  product: AdminProductDetailDto;
  onChange(product: AdminProductDetailDto): void;
}) {
  const showToast = useToastStore((state) => state.show);
  const [busy, setBusy] = useState(false);
  async function upload(file?: File) {
    if (!file) return;
    setBusy(true);
    const result = await uploadAdminProductMedia(product.id, file);
    setBusy(false);
    if (result.ok) onChange(result.data);
    else showToast(result.message, "danger");
  }
  async function remove(url: string) {
    setBusy(true);
    const result = await removeAdminProductMedia(product.id, url);
    setBusy(false);
    if (result.ok) onChange(result.data);
    else showToast(result.message, "danger");
  }
  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="subtitle1" component="h3" fontWeight={700}>
          رسانه محصول
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          تصویر اصلی به‌صورت خودکار در اندازه‌ها و قالب‌های بهینه تولید می‌شود.
        </Typography>
        <Button component="label" variant="contained" disabled={busy}>
          افزودن تصویر
          <input
            hidden
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            onChange={(event) => void upload(event.target.files?.[0])}
          />
        </Button>
        <Box
          sx={{
            mt: 2,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))",
            gap: 2,
          }}
        >
          {product.media.map((url) => (
            <Box key={url} sx={{ border: 1, borderColor: "divider", borderRadius: 2, p: 1 }}>
              <Box
                component="img"
                src={url}
                alt=""
                sx={{ width: "100%", aspectRatio: "1", objectFit: "contain" }}
              />
              <Button color="error" size="small" onClick={() => void remove(url)} disabled={busy}>
                حذف
              </Button>
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
}

function VariantsPanel({
  product,
  onChange,
}: {
  product: AdminProductDetailDto;
  onChange(product: AdminProductDetailDto): void;
}) {
  const showToast = useToastStore((state) => state.show);
  const [variants, setVariants] = useState(product.variants);
  const [saving, setSaving] = useState(false);
  const update = (
    index: number,
    field: "fa" | "en" | "sku" | "priceRial" | "wholesalePriceRial" | "stock",
    value: string,
  ) =>
    setVariants((current) =>
      current.map((variant, itemIndex) =>
        itemIndex !== index
          ? variant
          : field === "fa" || field === "en"
            ? { ...variant, name: { ...variant.name, [field]: value } }
            : {
                ...variant,
                [field]:
                  field === "sku"
                    ? value
                    : value === "" && field === "wholesalePriceRial"
                      ? undefined
                      : Number(value),
              },
      ),
    );
  async function save() {
    setSaving(true);
    const result = await updateAdminProduct(product.id, {
      variants: variants.map((variant) => ({
        name: variant.name,
        sku: variant.sku,
        priceRial: variant.priceRial,
        wholesalePriceRial: variant.wholesalePriceRial,
        stock: variant.stock,
      })),
    });
    setSaving(false);
    if (result.ok) {
      setVariants(result.data.variants);
      onChange(result.data);
      showToast("گونه‌ها ذخیره شدند", "success");
    } else showToast(result.message, "danger");
  }
  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="subtitle1" fontWeight={700}>
          گونه‌های محصول
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          هر گونه قیمت، کد کالا و موجودی مستقل دارد.
        </Typography>
        <Stack spacing={2}>
          {variants.map((variant, index) => (
            <Box
              key={variant.id || index}
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "1fr 1fr 1fr 1fr 1fr auto" },
                gap: 1,
              }}
            >
              <TextField
                size="small"
                label="نام فارسی"
                value={variant.name.fa}
                onChange={(e) => update(index, "fa", e.target.value)}
              />
              <TextField
                size="small"
                label="نام انگلیسی"
                value={variant.name.en}
                onChange={(e) => update(index, "en", e.target.value)}
              />
              <TextField
                size="small"
                label="SKU"
                value={variant.sku}
                onChange={(e) => update(index, "sku", e.target.value)}
              />
              <TextField
                size="small"
                type="number"
                label="قیمت"
                value={variant.priceRial}
                onChange={(e) => update(index, "priceRial", e.target.value)}
              />
              <TextField
                size="small"
                type="number"
                label="موجودی"
                value={variant.stock}
                onChange={(e) => update(index, "stock", e.target.value)}
              />
              <Button
                color="error"
                onClick={() => setVariants((current) => current.filter((_, i) => i !== index))}
              >
                حذف
              </Button>
            </Box>
          ))}
        </Stack>
        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
          <Button
            variant="outlined"
            onClick={() =>
              setVariants((current) => [
                ...current,
                {
                  id: `new-${Date.now()}`,
                  name: { fa: "", en: "" },
                  sku: "",
                  priceRial: product.priceRial,
                  stock: 0,
                },
              ])
            }
          >
            افزودن گونه
          </Button>
          <Button variant="contained" disabled={saving} onClick={() => void save()}>
            {saving ? "در حال ذخیره…" : "ذخیره گونه‌ها"}
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
      <MediaPanel product={product} onChange={setProduct} />
      <VariantsPanel product={product} onChange={setProduct} />
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
