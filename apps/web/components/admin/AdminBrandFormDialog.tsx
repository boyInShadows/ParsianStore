"use client"; // Controlled form fields, validation state, submit handler.

import { useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
} from "@mui/material";
import {
  adminCreateBrandInputSchema,
  type AdminBrandDto,
  type AdminCreateBrandInput,
} from "schemas";
import { createAdminBrand, updateAdminBrand } from "@/lib/fetchers/admin-catalog";
import { useToastStore } from "@/stores/toast-store";

// No `open` prop -- see AdminCategoryFormDialog for the reasoning.
type Props = {
  brand: AdminBrandDto | null;
  onClose: () => void;
  onSaved: () => void;
};

const EMPTY = { nameFa: "", nameEn: "", slug: "", country: "", description: "", isOEM: false };

function initialState(brand: AdminBrandDto | null): typeof EMPTY {
  if (!brand) return EMPTY;
  return {
    nameFa: brand.name.fa,
    nameEn: brand.name.en,
    slug: brand.slug,
    country: brand.country,
    description: brand.description ?? "",
    isOEM: brand.isOEM,
  };
}

export function AdminBrandFormDialog({ brand, onClose, onSaved }: Props) {
  const showToast = useToastStore((state) => state.show);
  const [form, setForm] = useState(() => initialState(brand));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  async function handleSubmit(): Promise<void> {
    const candidate: AdminCreateBrandInput = {
      name: { fa: form.nameFa.trim(), en: form.nameEn.trim() },
      slug: form.slug.trim(),
      country: form.country.trim(),
      isOEM: form.isOEM,
      ...(form.description.trim() ? { description: form.description.trim() } : {}),
    };

    const parsed = adminCreateBrandInputSchema.safeParse(candidate);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        next[issue.path.join(".")] = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    setSaving(true);
    const response = brand
      ? await updateAdminBrand(brand.id, parsed.data)
      : await createAdminBrand(parsed.data);
    setSaving(false);

    if (!response.ok) {
      showToast(response.message, "danger");
      return;
    }
    showToast(brand ? "برند به‌روزرسانی شد" : "برند ساخته شد", "success");
    onSaved();
  }

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{brand ? "ویرایش برند" : "برند جدید"}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="نام فارسی"
            value={form.nameFa}
            error={Boolean(errors["name.fa"])}
            helperText={errors["name.fa"]}
            onChange={(event) => setForm({ ...form, nameFa: event.target.value })}
            fullWidth
          />
          <TextField
            label="نام انگلیسی"
            value={form.nameEn}
            error={Boolean(errors["name.en"])}
            helperText={errors["name.en"]}
            onChange={(event) => setForm({ ...form, nameEn: event.target.value })}
            fullWidth
          />
          <TextField
            label="نامک"
            value={form.slug}
            error={Boolean(errors.slug)}
            helperText={errors.slug}
            onChange={(event) => setForm({ ...form, slug: event.target.value })}
            fullWidth
          />
          <TextField
            label="کشور"
            value={form.country}
            error={Boolean(errors.country)}
            helperText={errors.country}
            onChange={(event) => setForm({ ...form, country: event.target.value })}
            fullWidth
          />
          <TextField
            label="توضیح"
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            multiline
            minRows={2}
            fullWidth
          />
          {/* §1.2's trust signal — an OEM-grade brand is rendered differently
              on the PDP, so this is a real product flag, not decoration. */}
          <FormControlLabel
            control={
              <Switch
                checked={form.isOEM}
                onChange={(event) => setForm({ ...form, isOEM: event.target.checked })}
              />
            }
            label="برند اصلی (OEM)"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          انصراف
        </Button>
        <Button variant="contained" onClick={() => void handleSubmit()} disabled={saving}>
          ذخیره
        </Button>
      </DialogActions>
    </Dialog>
  );
}
