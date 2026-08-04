"use client"; // Fetches by id on mount and owns the deactivate action --
// same wrapper shape AdminProductEditContent establishes.

import { useEffect, useState } from "react";
import { Button, Card, CardContent, Stack, Typography } from "@mui/material";
import { formatJalali, type AdminCouponDto } from "schemas";
import { useRouter } from "@/i18n/navigation";
import { deactivateAdminCoupon, fetchAdminCoupon } from "@/lib/fetchers/admin-coupons";
import { useToastStore } from "@/stores/toast-store";
import { AdminCouponFormContent } from "./AdminCouponFormContent";

export function AdminCouponEditContent({ id }: { id: string }) {
  const router = useRouter();
  const showToast = useToastStore((state) => state.show);
  // undefined = still loading, null = genuinely not found. Same tri-state
  // AdminProductEditContent uses.
  const [coupon, setCoupon] = useState<AdminCouponDto | null | undefined>(undefined);
  const [deactivating, setDeactivating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetchAdminCoupon(id).then((data) => {
      if (!cancelled) setCoupon(data);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (coupon === undefined) {
    return <Typography color="text.secondary">در حال بارگذاری…</Typography>;
  }
  if (coupon === null) {
    return <Typography color="error">کد تخفیف یافت نشد</Typography>;
  }

  async function handleDeactivate(): Promise<void> {
    setDeactivating(true);
    const result = await deactivateAdminCoupon(id);
    setDeactivating(false);
    if (!result.ok) {
      showToast(result.message, "danger");
      return;
    }
    showToast("کد تخفیف غیرفعال شد", "success");
    setCoupon(result.data);
    router.push("/admin/discounts");
  }

  return (
    <Stack spacing={3}>
      <Card variant="outlined">
        <CardContent>
          <Stack spacing={1}>
            <Typography variant="h6" component="h2" sx={{ fontWeight: 700 }}>
              {coupon.code}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              تعداد استفاده تاکنون: {coupon.usedCount}
              {coupon.usageLimit != null ? ` از ${coupon.usageLimit}` : ""}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              ایجاد شده در {formatJalali(coupon.createdAt, "d MMMM yyyy")}
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      <AdminCouponFormContent mode="edit" coupon={coupon} />

      <Card variant="outlined">
        <CardContent>
          <Stack spacing={1.5} alignItems="flex-start">
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              غیرفعال‌سازی
            </Typography>
            <Typography variant="body2" color="text.secondary">
              پایان اعتبار روی همین لحظه تنظیم می‌شود؛ کد بلافاصله از کار می‌افتد اما سابقه استفاده
              و سفارش‌های قبلی دست‌نخورده باقی می‌ماند.
            </Typography>
            <Button
              variant="outlined"
              color="error"
              disabled={deactivating}
              onClick={() => void handleDeactivate()}
            >
              {deactivating ? "در حال غیرفعال‌سازی…" : "غیرفعال‌سازی کد"}
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
