"use client"; // Controlled form state + submit handler, same pattern
// AdminProductFormContent already establishes for admin CRUD forms.

import { useState, type FormEvent } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type { AdminCouponDto, AdminCreateCouponInput, CouponTypeDto } from "schemas";
import { useRouter } from "@/i18n/navigation";
import { createAdminCoupon, updateAdminCoupon } from "@/lib/fetchers/admin-coupons";
import { useToastStore } from "@/stores/toast-store";

type Props = { mode: "create" } | { mode: "edit"; coupon: AdminCouponDto };

// All-string state, converted to numbers/ISO only at submit -- same shape
// AdminProductFormContent uses, so an empty numeric field stays genuinely
// empty rather than collapsing to 0.
interface FormState {
  code: string;
  type: CouponTypeDto;
  value: string;
  minSubtotalRial: string;
  maxDiscountRial: string;
  usageLimit: string;
  perUserLimit: string;
  startsAt: string;
  endsAt: string;
}

/** `datetime-local` wants "YYYY-MM-DDTHH:mm" in *local* time, while the
 * API speaks UTC ISO (§9). Converting through the epoch keeps the wall
 * clock the admin typed intact instead of shifting it by the offset. */
function toLocalInput(iso?: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function toIso(local: string): string | undefined {
  return local ? new Date(local).toISOString() : undefined;
}

function initialState(coupon?: AdminCouponDto): FormState {
  return {
    code: coupon?.code ?? "",
    type: coupon?.type ?? "percent",
    value: coupon ? String(coupon.value) : "",
    minSubtotalRial: coupon?.minSubtotalRial != null ? String(coupon.minSubtotalRial) : "",
    maxDiscountRial: coupon?.maxDiscountRial != null ? String(coupon.maxDiscountRial) : "",
    usageLimit: coupon?.usageLimit != null ? String(coupon.usageLimit) : "",
    perUserLimit: coupon?.perUserLimit != null ? String(coupon.perUserLimit) : "",
    startsAt: toLocalInput(coupon?.startsAt),
    endsAt: toLocalInput(coupon?.endsAt),
  };
}

function optionalInt(raw: string): number | undefined {
  return raw.trim() === "" ? undefined : Number(raw);
}

export function AdminCouponFormContent(props: Props) {
  const router = useRouter();
  const showToast = useToastStore((state) => state.show);
  const [form, setForm] = useState<FormState>(
    initialState(props.mode === "edit" ? props.coupon : undefined),
  );
  const [saving, setSaving] = useState(false);

  function set<K extends keyof FormState>(key: K, value: FormState[K]): void {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    const input: AdminCreateCouponInput = {
      code: form.code.trim(),
      type: form.type,
      value: Number(form.value),
      minSubtotalRial: optionalInt(form.minSubtotalRial),
      maxDiscountRial: optionalInt(form.maxDiscountRial),
      usageLimit: optionalInt(form.usageLimit),
      perUserLimit: optionalInt(form.perUserLimit),
      startsAt: toIso(form.startsAt),
      endsAt: toIso(form.endsAt),
    };

    setSaving(true);
    const result =
      props.mode === "edit"
        ? await updateAdminCoupon(props.coupon.id, input)
        : await createAdminCoupon(input);
    setSaving(false);

    if (!result.ok) {
      showToast(result.message, "danger");
      return;
    }
    showToast(props.mode === "edit" ? "کد تخفیف به‌روزرسانی شد" : "کد تخفیف ایجاد شد", "success");
    router.push(`/admin/discounts/${result.data.id}`);
  }

  const isPercent = form.type === "percent";

  return (
    <Card variant="outlined">
      <CardContent>
        <Box component="form" onSubmit={(event) => void handleSubmit(event)}>
          <Stack spacing={2.5}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="کد تخفیف"
                  value={form.code}
                  onChange={(event) => set("code", event.target.value.toUpperCase())}
                  helperText="فقط حروف انگلیسی، عدد و خط تیره"
                  required
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Select
                  value={form.type}
                  onChange={(event) => set("type", event.target.value as CouponTypeDto)}
                  inputProps={{ "aria-label": "نوع تخفیف" }}
                  fullWidth
                >
                  <MenuItem value="percent">درصدی</MenuItem>
                  <MenuItem value="fixed">مبلغ ثابت</MenuItem>
                </Select>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label={isPercent ? "درصد تخفیف" : "مبلغ تخفیف (ریال)"}
                  type="number"
                  value={form.value}
                  onChange={(event) => set("value", event.target.value)}
                  inputProps={isPercent ? { min: 0, max: 100 } : { min: 0 }}
                  required
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="حداقل مبلغ سبد (ریال)"
                  type="number"
                  value={form.minSubtotalRial}
                  onChange={(event) => set("minSubtotalRial", event.target.value)}
                  inputProps={{ min: 0 }}
                  fullWidth
                />
              </Grid>
              {/* Only a percent coupon is capped -- coupon.service.ts's
                  computeDiscountRial ignores maxDiscountRial entirely for
                  a fixed one, so showing the field there would be a lie. */}
              {isPercent && (
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="سقف تخفیف (ریال)"
                    type="number"
                    value={form.maxDiscountRial}
                    onChange={(event) => set("maxDiscountRial", event.target.value)}
                    inputProps={{ min: 0 }}
                    fullWidth
                  />
                </Grid>
              )}
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="سقف کل استفاده"
                  type="number"
                  value={form.usageLimit}
                  onChange={(event) => set("usageLimit", event.target.value)}
                  helperText="خالی یعنی نامحدود"
                  inputProps={{ min: 1 }}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="سقف استفاده هر کاربر"
                  type="number"
                  value={form.perUserLimit}
                  onChange={(event) => set("perUserLimit", event.target.value)}
                  helperText="خالی یعنی نامحدود"
                  inputProps={{ min: 1 }}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="شروع اعتبار"
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(event) => set("startsAt", event.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="پایان اعتبار"
                  type="datetime-local"
                  value={form.endsAt}
                  onChange={(event) => set("endsAt", event.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                  fullWidth
                />
              </Grid>
            </Grid>

            <Typography variant="body2" color="text.secondary">
              خالی گذاشتن تاریخ‌ها یعنی کد بدون محدودیت زمانی فعال است.
            </Typography>

            <Stack direction="row" spacing={1.5}>
              <Button type="submit" variant="contained" disabled={saving}>
                {saving ? "در حال ذخیره…" : "ذخیره کد تخفیف"}
              </Button>
              <Button onClick={() => router.push("/admin/discounts")}>انصراف</Button>
            </Stack>
          </Stack>
        </Box>
      </CardContent>
    </Card>
  );
}
