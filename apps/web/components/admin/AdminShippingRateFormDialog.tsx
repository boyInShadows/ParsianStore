"use client"; // Controlled form fields, validation state, submit handler.

import { useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
} from "@mui/material";
import {
  SHIPPING_METHODS,
  SHIPPING_ZONES,
  adminCreateShippingRateInputSchema,
  formatToman,
  toEnglishDigits,
  type AdminCreateShippingRateInput,
  type AdminShippingRateDto,
} from "schemas";
import { createAdminShippingRate, updateAdminShippingRate } from "@/lib/fetchers/admin-shipping";
import { useToastStore } from "@/stores/toast-store";

// No `open` prop -- see AdminCategoryFormDialog for the reasoning.
type Props = {
  rate: AdminShippingRateDto | null;
  onClose: () => void;
  onSaved: () => void;
};

const ZONE_LABELS: Record<string, string> = { tehran: "تهران", other: "سایر استان‌ها" };

const EMPTY = {
  methodCode: SHIPPING_METHODS[0].code as string,
  zone: "other",
  minWeightGram: "0",
  maxWeightGram: "",
  priceToman: "",
  isOpenEnded: false,
};

function initialState(rate: AdminShippingRateDto | null): typeof EMPTY {
  if (!rate) return EMPTY;
  return {
    methodCode: rate.methodCode,
    zone: rate.zone,
    minWeightGram: String(rate.minWeightGram),
    maxWeightGram: rate.maxWeightGram === null ? "" : String(rate.maxWeightGram),
    // Staff think and type in Toman; the wire and the database stay Rial.
    priceToman: String(Math.trunc(rate.priceRial / 10)),
    isOpenEnded: rate.maxWeightGram === null,
  };
}

/** Every numeric field accepts Persian/Arabic-Indic digits (§7.5). */
function toNumber(input: string): number {
  return Number(toEnglishDigits(input).replace(/[^\d-]/g, ""));
}

export function AdminShippingRateFormDialog({ rate, onClose, onSaved }: Props) {
  const showToast = useToastStore((state) => state.show);
  const [form, setForm] = useState(() => initialState(rate));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const priceRial = toNumber(form.priceToman) * 10;

  async function handleSubmit(): Promise<void> {
    const candidate = {
      methodCode: form.methodCode,
      zone: form.zone,
      minWeightGram: toNumber(form.minWeightGram),
      maxWeightGram: form.isOpenEnded ? null : toNumber(form.maxWeightGram),
      priceRial,
    };

    const parsed = adminCreateShippingRateInputSchema.safeParse(candidate);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        next[issue.path.join(".") || "form"] = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    setSaving(true);
    const response = rate
      ? await updateAdminShippingRate(rate.id, parsed.data as AdminCreateShippingRateInput)
      : await createAdminShippingRate(parsed.data as AdminCreateShippingRateInput);
    setSaving(false);

    if (!response.ok) {
      showToast(response.message, "danger");
      return;
    }
    showToast(rate ? "نرخ ارسال به‌روزرسانی شد" : "نرخ ارسال ثبت شد", "success");
    onSaved();
  }

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{rate ? "ویرایش نرخ ارسال" : "نرخ ارسال جدید"}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            select
            label="روش ارسال"
            value={form.methodCode}
            onChange={(event) => setForm({ ...form, methodCode: event.target.value })}
            fullWidth
          >
            {SHIPPING_METHODS.map((method) => (
              <MenuItem key={method.code} value={method.code}>
                {method.name.fa}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="منطقه"
            value={form.zone}
            error={Boolean(errors.zone)}
            helperText={errors.zone}
            onChange={(event) => setForm({ ...form, zone: event.target.value })}
            fullWidth
          >
            {SHIPPING_ZONES.map((zone) => (
              <MenuItem key={zone} value={zone}>
                {ZONE_LABELS[zone] ?? zone}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="کمینه وزن (گرم)"
            value={form.minWeightGram}
            error={Boolean(errors.minWeightGram)}
            helperText={errors.minWeightGram}
            onChange={(event) => setForm({ ...form, minWeightGram: event.target.value })}
            fullWidth
          />
          {/* An open-ended bracket is a real, named state -- not "leave the
              max blank and hope", which is how a missing heavy-parcel price
              silently becomes "this courier is unavailable" at checkout. */}
          <FormControlLabel
            control={
              <Switch
                checked={form.isOpenEnded}
                onChange={(event) => setForm({ ...form, isOpenEnded: event.target.checked })}
              />
            }
            label="بدون سقف وزن (آخرین پله)"
          />
          {!form.isOpenEnded ? (
            <TextField
              label="بیشینه وزن (گرم)"
              value={form.maxWeightGram}
              error={Boolean(errors.maxWeightGram)}
              helperText={errors.maxWeightGram}
              onChange={(event) => setForm({ ...form, maxWeightGram: event.target.value })}
              fullWidth
            />
          ) : null}
          <TextField
            label="قیمت (تومان)"
            value={form.priceToman}
            error={Boolean(errors.priceRial)}
            helperText={
              errors.priceRial ??
              (priceRial > 0 ? `معادل ${formatToman(priceRial)}` : "قیمت را به تومان وارد کنید")
            }
            onChange={(event) => setForm({ ...form, priceToman: event.target.value })}
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
