"use client"; // Controlled form fields, a dynamic options list, submit handler.

import { useState } from "react";
import {
  Alert,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from "@mui/material";
import {
  ATTRIBUTE_TYPES,
  adminCreateAttributeInputSchema,
  type AdminAttributeDto,
  type AdminCreateAttributeInput,
  type AttributeTypeDto,
} from "schemas";
import { createAdminAttribute, updateAdminAttribute } from "@/lib/fetchers/admin-catalog";
import { useToastStore } from "@/stores/toast-store";
import { ATTRIBUTE_TYPE_LABELS } from "./AdminAttributesListContent";

// No `open` prop -- see AdminCategoryFormDialog for the reasoning.
type Props = {
  attribute: AdminAttributeDto | null;
  onClose: () => void;
  onSaved: () => void;
};

const EMPTY = { name: "", key: "", type: "select" as AttributeTypeDto, unit: "" };

function initialState(attribute: AdminAttributeDto | null): typeof EMPTY {
  if (!attribute) return EMPTY;
  return {
    name: attribute.name,
    key: attribute.key,
    type: attribute.type,
    unit: attribute.unit ?? "",
  };
}

export function AdminAttributeFormDialog({ attribute, onClose, onSaved }: Props) {
  const showToast = useToastStore((state) => state.show);
  const [form, setForm] = useState(() => initialState(attribute));
  const [options, setOptions] = useState<string[]>(attribute?.options ?? []);
  const [optionDraft, setOptionDraft] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  function addOption(): void {
    const value = optionDraft.trim();
    if (!value || options.includes(value)) return;
    setOptions([...options, value]);
    setOptionDraft("");
  }

  async function handleSubmit(): Promise<void> {
    const candidate: AdminCreateAttributeInput = {
      name: form.name.trim(),
      key: form.key.trim(),
      type: form.type,
      ...(form.unit.trim() ? { unit: form.unit.trim() } : {}),
      ...(form.type === "select" ? { options } : {}),
    };

    const parsed = adminCreateAttributeInputSchema.safeParse(candidate);
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
    const response = attribute
      ? await updateAdminAttribute(attribute.id, parsed.data)
      : await createAdminAttribute(parsed.data);
    setSaving(false);

    if (!response.ok) {
      showToast(response.message, "danger");
      return;
    }
    showToast(attribute ? "ویژگی به‌روزرسانی شد" : "ویژگی ساخته شد", "success");
    onSaved();
  }

  const keyLocked = Boolean(attribute && attribute.usageCount > 0);

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{attribute ? "ویرایش ویژگی" : "ویژگی جدید"}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="نام نمایشی"
            value={form.name}
            error={Boolean(errors.name)}
            helperText={errors.name ?? "همین نام در جدول مشخصات و فیلترها دیده می‌شود"}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            fullWidth
          />
          <TextField
            label="کلید"
            value={form.key}
            disabled={keyLocked}
            error={Boolean(errors.key)}
            helperText={
              errors.key ??
              (keyLocked
                ? "چون محصولی از این ویژگی استفاده می‌کند، کلید قابل تغییر نیست"
                : "شناسه انگلیسی، مثل color")
            }
            onChange={(event) => setForm({ ...form, key: event.target.value })}
            fullWidth
          />
          <TextField
            select
            label="نوع"
            value={form.type}
            onChange={(event) => setForm({ ...form, type: event.target.value as AttributeTypeDto })}
            fullWidth
          >
            {ATTRIBUTE_TYPES.map((value) => (
              <MenuItem key={value} value={value}>
                {ATTRIBUTE_TYPE_LABELS[value]}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="واحد"
            value={form.unit}
            onChange={(event) => setForm({ ...form, unit: event.target.value })}
            helperText="اختیاری، مثل mm"
            fullWidth
          />

          {form.type === "select" && (
            <Stack spacing={1}>
              <Stack direction="row" spacing={1}>
                <TextField
                  size="small"
                  label="افزودن گزینه"
                  value={optionDraft}
                  error={Boolean(errors.options)}
                  helperText={errors.options}
                  onChange={(event) => setOptionDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addOption();
                    }
                  }}
                  fullWidth
                />
                <Button onClick={addOption}>افزودن</Button>
              </Stack>
              <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
                {options.map((option) => (
                  <Chip
                    key={option}
                    label={option}
                    onDelete={() => setOptions(options.filter((value) => value !== option))}
                  />
                ))}
              </Stack>
              {/* The API rejects a select with no options, because such an
                  attribute could never be assigned to a product. */}
              <Alert severity="info">
                مقدار این ویژگی روی هر محصول باید یکی از همین گزینه‌ها باشد.
              </Alert>
            </Stack>
          )}
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
