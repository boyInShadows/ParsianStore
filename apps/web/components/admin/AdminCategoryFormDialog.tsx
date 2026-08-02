"use client"; // Controlled form fields, validation state, submit handler.

import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from "@mui/material";
import { CATALOG_SYSTEMS, adminCreateCategoryInputSchema, type AdminCategoryDto } from "schemas";
import {
  createAdminCategory,
  fetchAdminCategories,
  updateAdminCategory,
} from "@/lib/fetchers/admin-catalog";
import { useToastStore } from "@/stores/toast-store";

// No `open` prop: the parent mounts this only while the dialog is open, so
// initial state comes from props at mount rather than being re-synced by an
// effect -- which React's own lint rule flags as a cascading render.
type Props = {
  category: AdminCategoryDto | null;
  onClose: () => void;
  onSaved: () => void;
};

interface CategoryFormState {
  nameFa: string;
  nameEn: string;
  slug: string;
  systemCode: string;
  parentId: string;
  order: string;
}

const EMPTY: CategoryFormState = {
  nameFa: "",
  nameEn: "",
  slug: "",
  systemCode: CATALOG_SYSTEMS[0]?.code ?? "SYS-01",
  parentId: "",
  order: "0",
};

function initialState(category: AdminCategoryDto | null): CategoryFormState {
  if (!category) return EMPTY;
  return {
    nameFa: category.name.fa,
    nameEn: category.name.en,
    slug: category.slug,
    systemCode: category.systemCode,
    parentId: category.parentId ?? "",
    order: String(category.order),
  };
}

export function AdminCategoryFormDialog({ category, onClose, onSaved }: Props) {
  const showToast = useToastStore((state) => state.show);
  const [form, setForm] = useState(() => initialState(category));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [parents, setParents] = useState<AdminCategoryDto[]>([]);

  // A genuine external sync: the parent-picker options come from the API.
  useEffect(() => {
    void fetchAdminCategories(1, 100, {}).then((page) => setParents(page?.data ?? []));
  }, []);

  async function handleSubmit(): Promise<void> {
    // Left unannotated on purpose: the form holds raw strings, and the schema
    // is what narrows `systemCode` to the real CATALOG_SYSTEM_CODES union.
    // `parsed.data` below carries the narrowed type onward.
    const candidate = {
      name: { fa: form.nameFa.trim(), en: form.nameEn.trim() },
      slug: form.slug.trim(),
      systemCode: form.systemCode,
      order: Number(form.order) || 0,
      ...(form.parentId ? { parentId: form.parentId } : {}),
    };

    // Validated against the exact schema the API enforces, so the field-level
    // Persian messages match what the server would have said.
    const parsed = adminCreateCategoryInputSchema.safeParse(candidate);
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
    const response = category
      ? await updateAdminCategory(category.id, parsed.data)
      : await createAdminCategory(parsed.data);
    setSaving(false);

    if (!response.ok) {
      showToast(response.message, "danger");
      return;
    }
    showToast(category ? "دسته‌بندی به‌روزرسانی شد" : "دسته‌بندی ساخته شد", "success");
    onSaved();
  }

  // A category cannot be its own parent, nor sit under one of its own
  // descendants — the API refuses both, and offering them here would only
  // produce an error the staff member could have been spared.
  const parentOptions = parents.filter(
    (option) =>
      option.id !== category?.id && !(category ? option.path.includes(category.slug) : false),
  );

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{category ? "ویرایش دسته‌بندی" : "دسته‌بندی جدید"}</DialogTitle>
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
          {category && category.childCount > 0 && (
            <Alert severity="info">
              تغییر نامک به‌طور خودکار در مسیر همه زیرمجموعه‌ها اعمال می‌شود.
            </Alert>
          )}
          <TextField
            select
            label="سیستم"
            value={form.systemCode}
            onChange={(event) => setForm({ ...form, systemCode: event.target.value })}
            fullWidth
          >
            {CATALOG_SYSTEMS.map((system) => (
              <MenuItem key={system.code} value={system.code}>
                {system.name.fa}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="دسته‌بندی والد"
            value={form.parentId}
            onChange={(event) => setForm({ ...form, parentId: event.target.value })}
            disabled={Boolean(category && category.childCount > 0)}
            helperText={
              category && category.childCount > 0
                ? "تا زمانی که زیرمجموعه دارد، جابه‌جایی ممکن نیست"
                : "خالی یعنی دسته‌بندی اصلی"
            }
            fullWidth
          >
            <MenuItem value="">بدون والد</MenuItem>
            {parentOptions.map((option) => (
              <MenuItem key={option.id} value={option.id}>
                {[...option.ancestorNames, option.name.fa].join(" / ")}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="ترتیب نمایش"
            type="number"
            value={form.order}
            onChange={(event) => setForm({ ...form, order: event.target.value })}
            fullWidth
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
